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
import { MEMBER_COLUMNS, toGroupMember } from "@/lib/data/mappers";
import { isUuid } from "@/lib/data/source";
import { memberSchema, type MemberFormValues } from "@/lib/schemas/member";
import type { ActionResult } from "@/lib/types/action";
import type { GroupMember } from "@/lib/types/domain";

// 멤버 명부 추가·삭제 Server Action.
// 소유자 판별은 RLS(group_members → groups.owner_id)가 한다. 타인 모임·없는 모임에 추가하면
// RLS(with check) 위반이 되어 not_found로 응답한다(존재 여부 비노출).
// 동명이인은 허용한다(중복 경고는 화면에서만).

const MESSAGES = {
  groupNotFound: COMMON_MESSAGES.groupNotFound,
  memberNotFound: "メンバーが見つかりません。",
  addFailed:
    "メンバーを追加できませんでした。しばらくしてからもう一度お試しください。",
  deleteFailed:
    "メンバーを削除できませんでした。しばらくしてからもう一度お試しください。",
} as const;

// 명부를 보여주는 모임 상세, 명부 기준으로 "응답 미완료"를 집계하는 대시보드
function revalidateMemberPaths(groupId: string) {
  revalidatePath("/protected");
  revalidatePath(`/protected/groups/${groupId}`);
}

// 명부에 멤버 추가
export async function addMember(
  groupId: string,
  values: MemberFormValues,
): Promise<ActionResult<{ member: GroupMember }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(groupId)) return fail("not_found", MESSAGES.groupNotFound);

  const parsed = memberSchema.safeParse(values);
  if (!parsed.success) return validationFailed(toFieldErrors(parsed.error));

  const { data, error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      name: parsed.data.name,
      memo: parsed.data.memo.trim(),
    })
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) {
    return dbFailure("addMember", error, {
      failed: MESSAGES.addFailed,
      notFound: MESSAGES.groupNotFound,
    });
  }

  revalidateMemberPaths(groupId);
  return { ok: true, data: { member: toGroupMember(data) } };
}

// 명부에서 멤버 삭제. 과거 응답·정산 항목은 이름 스냅샷으로 남고 연결(member_id)만 끊긴다(FK set null).
export async function deleteMember(
  groupId: string,
  memberId: string,
): Promise<ActionResult<{ deleted: true }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(groupId) || !isUuid(memberId)) {
    return fail("not_found", MESSAGES.memberNotFound);
  }

  // 모임 id도 조건에 넣어 다른 모임의 멤버를 지우지 않게 한다.
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("id");
  if (error) {
    return dbFailure("deleteMember", error, { failed: MESSAGES.deleteFailed });
  }
  if (!data || data.length === 0) {
    return fail("not_found", MESSAGES.memberNotFound);
  }

  revalidateMemberPaths(groupId);
  // 응답 현황·정산 화면의 명부 연결 표시도 바뀌므로 /protected 아래 전체를 갱신한다.
  revalidatePath("/protected", "layout");
  return { ok: true, data: { deleted: true } };
}
