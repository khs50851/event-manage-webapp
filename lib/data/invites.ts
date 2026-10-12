import { connection } from "next/server";
import { z } from "zod";

import { createAvatarSignedUrls } from "@/lib/data/avatars";
import { nowKstLocalString } from "@/lib/format";
import {
  mockEvents,
  mockGroups,
  mockInviteTokens,
  mockMembers,
  mockRsvps,
} from "@/lib/mock/data";
import { isDeadlinePassed } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import type { InviteLookup, Rsvp } from "@/lib/types/domain";

// 초대·응답 더미 조회 함수. 연동 단계(I3)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// get_event_respondent_avatars 반환 행
const respondentAvatarRowSchema = z.object({
  rsvp_id: z.string(),
  avatar_path: z.string().nullable(),
});

// 주최자용: 회차 응답 목록에 로그인 응답자의 프로필 사진 서명 URL(avatarUrl)을 붙인다.
// - 세션이 없거나 eventId가 uuid가 아니면(더미 데이터) 조회하지 않고 avatarUrl: null로 채운다.
// - RPC는 회차 소유자에게만 결과를 주고(비소유자·없는 회차는 빈 결과), 서명은 Storage RLS
//   (avatars_select_event_owner)가 한 번 더 확인한다. 실패해도 응답 목록은 사진 없이 그대로 보여준다.
export async function attachRespondentAvatars(
  eventId: string,
  rsvps: Rsvp[],
): Promise<Rsvp[]> {
  const withoutAvatars = rsvps.map((item) => ({ ...item, avatarUrl: null }));
  if (rsvps.length === 0 || !z.uuid().safeParse(eventId).success) {
    return withoutAvatars;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return withoutAvatars;

  const { data, error } = await supabase.rpc("get_event_respondent_avatars", {
    p_event_id: eventId,
  });
  const parsed = z.array(respondentAvatarRowSchema).safeParse(data);
  if (error || !parsed.success) return withoutAvatars;

  // rsvp.id → 사진 경로
  const pathByRsvpId = new Map<string, string>();
  for (const row of parsed.data) {
    if (row.avatar_path) pathByRsvpId.set(row.rsvp_id, row.avatar_path);
  }
  if (pathByRsvpId.size === 0) return withoutAvatars;

  const urlByPath = await createAvatarSignedUrls(supabase, [
    ...pathByRsvpId.values(),
  ]);

  return rsvps.map((item) => {
    const path = pathByRsvpId.get(item.id);
    return { ...item, avatarUrl: (path && urlByPath.get(path)) || null };
  });
}

// 주최자용: 회차의 전체 응답
export async function listRsvps(eventId: string): Promise<Rsvp[]> {
  await delay();
  const rsvps = mockRsvps.filter((item) => item.eventId === eventId);
  // 더미 회차 id는 uuid가 아니므로 attachRespondentAvatars는 DB를 조회하지 않고 avatarUrl: null을 채운다.
  // 연동 단계(I3)에서 rsvps를 Supabase 조회로 바꾸면 이 호출이 그대로 실제 사진 URL을 붙인다.
  return attachRespondentAvatars(eventId, rsvps);
}

// 주최자용: 회차의 현재 유효한 초대 토큰
export async function getActiveInviteToken(
  eventId: string,
): Promise<string | null> {
  await delay();
  return (
    mockInviteTokens.find((item) => item.eventId === eventId && !item.revoked)
      ?.token ?? null
  );
}

// 비회원용: 토큰으로 초대 페이지 데이터를 조회한다.
// 무효·만료 토큰이면 회차 정보를 반환하지 않고, 공개 데이터에서 연락처 메모를 제거한다(Q6, R1).
export async function getInviteByToken(token: string): Promise<InviteLookup> {
  // 마감 판정은 요청 시점 시각이 필요하므로 프리렌더에서 제외한다.
  await connection();
  await delay();

  const invite = mockInviteTokens.find((item) => item.token === token);
  if (!invite) return { status: "invalid" };
  if (invite.revoked) return { status: "expired" };

  const event = mockEvents.find((item) => item.id === invite.eventId);
  if (!event) return { status: "invalid" };
  const groupName =
    mockGroups.find((group) => group.id === event.groupId)?.name ?? "";

  if (event.status === "cancelled") {
    return { status: "cancelled", event, groupName };
  }

  const rsvps = mockRsvps.filter((item) => item.eventId === event.id);

  if (event.status === "ended") {
    return { status: "closed", reason: "ended", event, groupName, rsvps };
  }
  if (isDeadlinePassed(event.rsvpDeadline, nowKstLocalString())) {
    return { status: "closed", reason: "deadline", event, groupName, rsvps };
  }

  const members = mockMembers
    .filter((member) => member.groupId === event.groupId)
    .map(({ id, name }) => ({ id, name }));

  return { status: "open", event, groupName, members, rsvps };
}
