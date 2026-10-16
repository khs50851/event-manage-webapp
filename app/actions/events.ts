"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailure,
  fail,
  getSessionClient,
  toFieldErrors,
  unauthenticated,
  validationFailed,
} from "@/lib/actions/shared";
import {
  EVENT_COLUMNS,
  fromKstLocal,
  INVALID_DATETIME_MESSAGE,
  toEventWriteFields,
  toGroupEvent,
} from "@/lib/data/mappers";
import { isUuid } from "@/lib/data/source";
import { eventSchema, type EventFormValues } from "@/lib/schemas/event";
import type { ActionResult } from "@/lib/types/action";
import type { GroupEvent } from "@/lib/types/domain";

// 회차 생성(복제 포함)·수정·취소 Server Action.
// 소유자 판별은 RLS(events → groups.owner_id)가 한다. 없는 회차·타인 회차는 0행이므로 not_found.
// 상태 규칙은 화면(components/groups/event-list.tsx)과 같다:
// - 취소된 회차는 수정할 수 없다(종료된 회차는 수정 가능). 수정은 상태를 바꾸지 않는다.
// - 취소는 예정 회차만 가능하다. 이미 취소된 회차는 그대로 성공으로 돌려준다(중복 요청 대비).
// 회차를 만들면 DB 트리거가 초대 토큰을 자동 발급한다.

const MESSAGES = {
  groupNotFound: "모임을 찾을 수 없어요.",
  eventNotFound: "회차를 찾을 수 없어요.",
  cancelledNotEditable: "취소된 회차는 수정할 수 없어요.",
  endedNotCancellable: "종료된 회차는 취소할 수 없어요.",
  createFailed: "회차를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  updateFailed: "회차를 수정하지 못했어요. 잠시 후 다시 시도해 주세요.",
  cancelFailed: "회차를 취소하지 못했어요. 잠시 후 다시 시도해 주세요.",
  deadlineFailed: "응답 마감을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  deadlineAfterStart: "응답 마감은 시작 시각보다 늦을 수 없어요.",
} as const;

// 회차 목록(모임 상세), 회차 상세·정산 화면, 대시보드 카드
function revalidateEventPaths(groupId: string, eventId: string) {
  revalidatePath("/protected");
  revalidatePath(`/protected/groups/${groupId}`);
  revalidatePath(`/protected/events/${eventId}`);
  revalidatePath(`/protected/events/${eventId}/settlement`);
}

// 폼 값 검증 + DB 쓰기 값 변환(시각은 한국 시간 → timestamptz)
function parseEventValues(values: EventFormValues) {
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: toFieldErrors(parsed.error) };
  }
  return toEventWriteFields(parsed.data);
}

// 회차 생성. 복제도 화면이 복제 폼 값을 그대로 보내 이 함수로 처리한다.
export async function createEvent(
  groupId: string,
  values: EventFormValues,
): Promise<ActionResult<{ event: GroupEvent }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(groupId)) return fail("not_found", MESSAGES.groupNotFound);

  const write = parseEventValues(values);
  if (!write.ok) return validationFailed(write.fieldErrors);

  const { data, error } = await supabase
    .from("events")
    .insert({ group_id: groupId, ...write.fields })
    .select(EVENT_COLUMNS)
    .single();
  if (error || !data) {
    return dbFailure("createEvent", error, {
      failed: MESSAGES.createFailed,
      notFound: MESSAGES.groupNotFound,
    });
  }

  revalidateEventPaths(groupId, data.id);
  return { ok: true, data: { event: toGroupEvent(data) } };
}

// 회차 수정(취소된 회차 제외)
export async function updateEvent(
  eventId: string,
  values: EventFormValues,
): Promise<ActionResult<{ event: GroupEvent }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId)) return fail("not_found", MESSAGES.eventNotFound);

  const write = parseEventValues(values);
  if (!write.ok) return validationFailed(write.fieldErrors);

  // 현재 상태 확인(취소 여부). RLS로 타인 회차는 null.
  const { data: current, error: readError } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .maybeSingle();
  if (readError) {
    return dbFailure("updateEvent", readError, {
      failed: MESSAGES.updateFailed,
    });
  }
  if (!current) return fail("not_found", MESSAGES.eventNotFound);
  if (current.status === "cancelled") {
    return validationFailed(undefined, MESSAGES.cancelledNotEditable);
  }

  // 확인과 수정 사이에 취소된 경우까지 막도록 조건을 함께 건다.
  const { data, error } = await supabase
    .from("events")
    .update(write.fields)
    .eq("id", eventId)
    .neq("status", "cancelled")
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    return dbFailure("updateEvent", error, { failed: MESSAGES.updateFailed });
  }
  if (!data) return fail("not_found", MESSAGES.eventNotFound);

  revalidateEventPaths(data.group_id, data.id);
  return { ok: true, data: { event: toGroupEvent(data) } };
}

// 응답 마감 시각 설정·해제(FR-13). rsvpDeadline: "YYYY-MM-DDTHH:mm"(한국 시간), 빈 문자열·null이면 마감 없음.
// 마감은 회차 시작 시각보다 늦을 수 없다(DB check와 같은 규칙). 취소된 회차는 바꿀 수 없다.
export async function setRsvpDeadline(
  eventId: string,
  rsvpDeadline: string | null,
): Promise<ActionResult<{ event: GroupEvent }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId)) return fail("not_found", MESSAGES.eventNotFound);

  const raw = typeof rsvpDeadline === "string" ? rsvpDeadline.trim() : "";
  const deadline = raw === "" ? null : fromKstLocal(raw);
  if (raw !== "" && deadline === null) {
    return validationFailed({ rsvpDeadline: INVALID_DATETIME_MESSAGE });
  }

  const { data: current, error: readError } = await supabase
    .from("events")
    .select("status, starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (readError) {
    return dbFailure("setRsvpDeadline", readError, {
      failed: MESSAGES.deadlineFailed,
    });
  }
  if (!current) return fail("not_found", MESSAGES.eventNotFound);
  if (current.status === "cancelled") {
    return validationFailed(undefined, MESSAGES.cancelledNotEditable);
  }
  if (
    deadline !== null &&
    new Date(deadline).getTime() > new Date(current.starts_at).getTime()
  ) {
    return validationFailed({ rsvpDeadline: MESSAGES.deadlineAfterStart });
  }

  const { data, error } = await supabase
    .from("events")
    .update({ rsvp_deadline: deadline })
    .eq("id", eventId)
    .neq("status", "cancelled")
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    return dbFailure("setRsvpDeadline", error, {
      failed: MESSAGES.deadlineFailed,
    });
  }
  if (!data) return fail("not_found", MESSAGES.eventNotFound);

  revalidateEventPaths(data.group_id, data.id);
  return { ok: true, data: { event: toGroupEvent(data) } };
}

// 회차 취소(예정 → 취소됨)
export async function cancelEvent(
  eventId: string,
): Promise<ActionResult<{ event: GroupEvent }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId)) return fail("not_found", MESSAGES.eventNotFound);

  const { data, error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .eq("status", "scheduled")
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) {
    return dbFailure("cancelEvent", error, { failed: MESSAGES.cancelFailed });
  }
  if (data) {
    revalidateEventPaths(data.group_id, data.id);
    return { ok: true, data: { event: toGroupEvent(data) } };
  }

  // 바뀐 행이 없으면 원인을 나눈다: 없음/타인 회차, 이미 취소됨, 종료됨
  const { data: current, error: readError } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (readError) {
    return dbFailure("cancelEvent", readError, {
      failed: MESSAGES.cancelFailed,
    });
  }
  if (!current) return fail("not_found", MESSAGES.eventNotFound);
  if (current.status === "cancelled") {
    return { ok: true, data: { event: toGroupEvent(current) } };
  }
  return validationFailed(undefined, MESSAGES.endedNotCancellable);
}
