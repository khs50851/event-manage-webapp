"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailure,
  fail,
  getSessionClient,
  MESSAGES as COMMON_MESSAGES,
  toFieldErrors,
  unauthenticated,
  validationFailed,
} from "@/lib/actions/shared";
import { GROUP_COLUMNS, toEventWriteFields, toGroup } from "@/lib/data/mappers";
import { isUuid } from "@/lib/data/source";
import { eventSchema, type EventFormValues } from "@/lib/schemas/event";
import { groupSchema, type GroupFormValues } from "@/lib/schemas/group";
import type { Database } from "@/lib/supabase/database.types";
import type { ActionResult } from "@/lib/types/action";
import type { Group } from "@/lib/types/domain";

// 모임 생성·수정·삭제와 1회성 이벤트 생성 Server Action.
// Server Action은 UI 밖에서도 POST로 호출될 수 있으므로 세션·입력을 모두 여기서 다시 검증한다.
// 소유자 판별은 RLS(groups.owner_id = auth.uid())가 하고, owner_id는 DB 기본값(auth.uid())을 쓴다.
// 대상이 없거나 타인 소유면 RLS로 0행이 되므로 not_found로 응답한다(존재 여부 비노출).

const MESSAGES = {
  notFound: COMMON_MESSAGES.groupNotFound,
  createFailed:
    "グループを作成できませんでした。しばらくしてからもう一度お試しください。",
  oneOffFailed:
    "イベントを作成できませんでした。しばらくしてからもう一度お試しください。",
  updateFailed:
    "グループを編集できませんでした。しばらくしてからもう一度お試しください。",
  deleteFailed:
    "グループを削除できませんでした。しばらくしてからもう一度お試しください。",
} as const;

// 모임 목록·건수를 보여주는 화면(홈, 대시보드, 내 정보)
function revalidateGroupListPaths() {
  revalidatePath("/");
  revalidatePath("/protected");
  revalidatePath("/protected/me");
}

// 모임 목록 화면과 해당 모임 상세
function revalidateGroupPaths(groupId: string) {
  revalidateGroupListPaths();
  revalidatePath(`/protected/groups/${groupId}`);
}

// 모임 생성
export async function createGroup(
  values: GroupFormValues,
): Promise<ActionResult<{ groupId: string }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();

  const parsed = groupSchema.safeParse(values);
  if (!parsed.success) return validationFailed(toFieldErrors(parsed.error));

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description.trim(),
    })
    .select("id")
    .single();
  if (error || !data) {
    return dbFailure("createGroup", error, { failed: MESSAGES.createFailed });
  }

  revalidateGroupPaths(data.id);
  return { ok: true, data: { groupId: data.id } };
}

// 1회성 이벤트: is_one_off 모임 1개 + 회차 1개를 한 트랜잭션으로 만든다.
// RPC create_one_off_event(SECURITY INVOKER)가 RLS를 그대로 적용하며, 회차 저장이 실패하면 모임도 롤백된다.
// 모임 이름은 회차 제목(50자 이하)을 그대로 쓴다.
export async function createOneOffEvent(
  values: EventFormValues,
): Promise<ActionResult<{ groupId: string; eventId: string }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return validationFailed(toFieldErrors(parsed.error));
  const write = toEventWriteFields(parsed.data);
  if (!write.ok) return validationFailed(write.fieldErrors);
  const { fields } = write;

  // 생성 타입은 SQL 함수 인자의 null 허용을 표현하지 못한다(모든 인자가 non-null로 생성됨).
  // 정원·응답 마감은 비워 둘 수 있으므로 이 인자 객체만 생성 타입으로 단언한다.
  const args = {
    p_title: fields.title,
    p_starts_at: fields.starts_at,
    p_location: fields.location,
    p_capacity: fields.capacity,
    p_description: fields.description,
    p_rsvp_deadline: fields.rsvp_deadline,
  } as Database["public"]["Functions"]["create_one_off_event"]["Args"];

  const { data, error } = await supabase.rpc("create_one_off_event", args);
  const created = data?.[0];
  if (error || !created) {
    return dbFailure("createOneOffEvent", error, {
      failed: MESSAGES.oneOffFailed,
    });
  }

  revalidateGroupPaths(created.group_id);
  return {
    ok: true,
    data: { groupId: created.group_id, eventId: created.event_id },
  };
}

// 모임 이름·설명 수정
export async function updateGroup(
  groupId: string,
  values: GroupFormValues,
): Promise<ActionResult<{ group: Group }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(groupId)) return fail("not_found", MESSAGES.notFound);

  const parsed = groupSchema.safeParse(values);
  if (!parsed.success) return validationFailed(toFieldErrors(parsed.error));

  const { data, error } = await supabase
    .from("groups")
    .update({
      name: parsed.data.name,
      description: parsed.data.description.trim(),
    })
    .eq("id", groupId)
    .select(GROUP_COLUMNS)
    .maybeSingle();
  if (error) {
    return dbFailure("updateGroup", error, { failed: MESSAGES.updateFailed });
  }
  if (!data) return fail("not_found", MESSAGES.notFound);

  revalidateGroupPaths(groupId);
  return { ok: true, data: { group: toGroup(data) } };
}

// 모임 삭제. 하위 멤버·회차·초대 토큰·응답·정산·정산 토큰·정산 항목은 FK cascade로 함께 삭제된다.
export async function deleteGroup(
  groupId: string,
): Promise<ActionResult<{ deleted: true }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(groupId)) return fail("not_found", MESSAGES.notFound);

  const { data, error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .select("id");
  if (error) {
    return dbFailure("deleteGroup", error, { failed: MESSAGES.deleteFailed });
  }
  if (!data || data.length === 0) return fail("not_found", MESSAGES.notFound);

  // 삭제 직후 클라이언트가 /protected로 이동하므로, 지금 보고 있는 모임 상세(와 그 상위 레이아웃)는
  // 재검증하지 않는다. 재검증하면 삭제 응답과 함께 상세가 다시 렌더링되어 이동 전에
  // "모임을 찾을 수 없어요" 화면이 잠깐 보일 수 있다. 목록·건수를 보여주는 화면만 갱신한다.
  // 삭제된 모임의 회차·정산 화면은 요청 시점 데이터라 캐시되지 않고, 다시 열면 RLS로 404가 된다.
  revalidateGroupListPaths();
  return { ok: true, data: { deleted: true } };
}
