"use server";

import {
  dbFailure,
  fail,
  getSessionClient,
  revalidateRsvpPaths,
  toFieldErrors,
  unauthenticated,
  validationFailed,
} from "@/lib/actions/shared";
import { attachRespondentAvatars } from "@/lib/data/invites";
import { RSVP_COLUMNS, toRsvp } from "@/lib/data/mappers";
import { isUuid } from "@/lib/data/source";
import {
  DIRECT_INPUT,
  rsvpSchema,
  type RsvpFormValues,
} from "@/lib/schemas/rsvp";
import type { ActionResult } from "@/lib/types/action";
import type { Rsvp } from "@/lib/types/domain";

// 주최자 응답 대리 입력·수정·삭제 Server Action(FR-07, R3).
// 소유자 판별은 RLS(rsvps → events → groups.owner_id)가 한다. 타인 회차·없는 회차는 not_found.
// 주최자가 저장한 응답은 출처를 "host"로 남긴다. 비회원 식별자·계정(respondent_key·user_id)은
// 컬럼 권한상 쓸 수 없으므로 대리 입력 행은 참가자 본인 응답과 연결되지 않는다
// (같은 사람이 링크로 다시 응답하면 별도 행이 생길 수 있어 주최자가 정리한다).

const MESSAGES = {
  eventNotFound: "회차를 찾을 수 없어요.",
  rsvpNotFound: "응답을 찾을 수 없어요.",
  duplicateMember: "이미 응답이 있는 멤버예요. 기존 응답을 수정해 주세요.",
  invalidMember: "명부에서 이름을 다시 선택해 주세요.",
  saveFailed: "응답을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  deleteFailed: "응답을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

// 응답 대리 입력(rsvpId 없음) 또는 기존 응답 수정(rsvpId 지정).
// 반환 응답에는 로그인 응답자의 프로필 사진 URL(avatarUrl)을 다시 붙인다.
export async function upsertHostRsvp(
  eventId: string,
  values: RsvpFormValues,
  rsvpId?: string | null,
): Promise<ActionResult<{ rsvp: Rsvp }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId)) return fail("not_found", MESSAGES.eventNotFound);
  if (rsvpId != null && !isUuid(rsvpId)) {
    return fail("not_found", MESSAGES.rsvpNotFound);
  }

  const parsed = rsvpSchema.safeParse(values);
  if (!parsed.success) return validationFailed(toFieldErrors(parsed.error));
  const { name, status } = parsed.data;
  const memberId =
    parsed.data.memberId === DIRECT_INPUT ? null : parsed.data.memberId;
  if (memberId !== null && !isUuid(memberId)) {
    return validationFailed({ memberId: MESSAGES.invalidMember });
  }

  // 같은 멤버의 응답이 이미 있으면 막는다(대리 입력 중복 방지). RLS로 소유 회차의 응답만 보인다.
  if (memberId !== null) {
    let query = supabase
      .from("rsvps")
      .select("id")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .limit(1);
    if (rsvpId) query = query.neq("id", rsvpId);
    const { data: duplicates, error: dupError } = await query;
    if (dupError) {
      return dbFailure("upsertHostRsvp", dupError, {
        failed: MESSAGES.saveFailed,
      });
    }
    if (duplicates.length > 0) {
      return validationFailed({ memberId: MESSAGES.duplicateMember });
    }
  }

  const fields = { member_id: memberId, name, status, source: "host" };

  const { data, error } = rsvpId
    ? await supabase
        .from("rsvps")
        .update(fields)
        .eq("id", rsvpId)
        .eq("event_id", eventId)
        .select(RSVP_COLUMNS)
        .maybeSingle()
    : await supabase
        .from("rsvps")
        .insert({ event_id: eventId, ...fields })
        .select(RSVP_COLUMNS)
        .single();
  if (error) {
    // 다른 모임 멤버(트리거 23514)는 validation, RLS 위반(타인 회차)은 not_found
    return dbFailure("upsertHostRsvp", error, {
      failed: MESSAGES.saveFailed,
      notFound: MESSAGES.eventNotFound,
    });
  }
  if (!data) return fail("not_found", MESSAGES.rsvpNotFound);

  revalidateRsvpPaths();
  const [rsvp] = await attachRespondentAvatars(eventId, [toRsvp(data)]);
  return { ok: true, data: { rsvp } };
}

// 응답 삭제. 정산 항목의 응답 연결(rsvp_id)은 끊기고 이름 스냅샷은 남는다(FK set null).
export async function deleteRsvp(
  eventId: string,
  rsvpId: string,
): Promise<ActionResult<{ deleted: true }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId) || !isUuid(rsvpId)) {
    return fail("not_found", MESSAGES.rsvpNotFound);
  }

  const { data, error } = await supabase
    .from("rsvps")
    .delete()
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    return dbFailure("deleteRsvp", error, { failed: MESSAGES.deleteFailed });
  }
  if (!data || data.length === 0) {
    return fail("not_found", MESSAGES.rsvpNotFound);
  }

  revalidateRsvpPaths();
  return { ok: true, data: { deleted: true } };
}
