import { connection } from "next/server";
import { z } from "zod";

import { createAvatarSignedUrls } from "@/lib/data/avatars";
import { RSVP_COLUMNS, toRsvp } from "@/lib/data/mappers";
import { readRespondentKey } from "@/lib/data/respondent-key";
import {
  isUuid,
  mockDelay,
  readFailed,
  resolveDataSource,
} from "@/lib/data/source";
import { nowKstLocalString } from "@/lib/format";
import {
  mockEvents,
  mockGroups,
  mockInviteTokens,
  mockMembers,
  mockRsvps,
} from "@/lib/mock/data";
import { isDeadlinePassed } from "@/lib/rsvp";
import { parseInviteLookup } from "@/lib/schemas/invite";
import { createClient } from "@/lib/supabase/server";
import type { InviteLookup, Rsvp } from "@/lib/types/domain";

// 초대·응답 조회 함수(I3).
// - 주최자용(listRsvps, getActiveInviteToken): 세션이 있으면 Supabase(RLS: 본인 소유 회차만),
//   세션이 없으면 개발 환경 더미(lib/data/source.ts).
// - 비회원용(getInviteByToken): 세션이 없어도 공개 RPC(get_invite)를 호출한다. 개발 환경의 더미 토큰(demo-*)만 더미로 응답한다.
// DB 오류는 내부 정보 없이 던져 라우트의 error.tsx(재시도)로 보낸다.

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
  if (rsvps.length === 0 || !isUuid(eventId)) {
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

// 주최자용: 회차의 전체 응답(응답 시각 순). 소유자가 아니거나 없는 회차는 빈 목록.
export async function listRsvps(eventId: string): Promise<Rsvp[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    // 더미 회차 id는 uuid가 아니므로 attachRespondentAvatars는 DB를 조회하지 않고 avatarUrl: null을 채운다.
    return attachRespondentAvatars(
      eventId,
      mockRsvps.filter((item) => item.eventId === eventId),
    );
  }
  if (source.kind === "none" || !isUuid(eventId)) return [];

  const { data, error } = await source.supabase
    .from("rsvps")
    .select(RSVP_COLUMNS)
    .eq("event_id", eventId)
    .order("responded_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) readFailed("listRsvps", error.code);
  return attachRespondentAvatars(eventId, data.map(toRsvp));
}

// 주최자용: 회차의 현재 유효한 초대 토큰(회차당 최대 1개). 없거나 소유자가 아니면 null.
export async function getActiveInviteToken(
  eventId: string,
): Promise<string | null> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return (
      mockInviteTokens.find((item) => item.eventId === eventId && !item.revoked)
        ?.token ?? null
    );
  }
  if (source.kind === "none" || !isUuid(eventId)) return null;

  const { data, error } = await source.supabase
    .from("event_invite_tokens")
    .select("token")
    .eq("event_id", eventId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) readFailed("getActiveInviteToken", error.code);
  return data?.token ?? null;
}

// 개발 환경 더미 토큰 여부(lib/mock의 demo-*). 프로덕션에서는 항상 false.
export function isMockInviteToken(token: string): boolean {
  return process.env.NODE_ENV !== "production" && token.startsWith("demo-");
}

// 더미 토큰 조회(개발 환경 UI 미리보기 전용). 연동 단계 I5-3(더미 제거)에서 함께 정리한다.
async function getMockInvite(token: string): Promise<InviteLookup> {
  await mockDelay();

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
    return {
      status: "closed",
      reason: "ended",
      event,
      groupName,
      rsvps,
      myRsvp: null,
    };
  }
  if (isDeadlinePassed(event.rsvpDeadline, nowKstLocalString())) {
    return {
      status: "closed",
      reason: "deadline",
      event,
      groupName,
      rsvps,
      myRsvp: null,
    };
  }

  const members = mockMembers
    .filter((member) => member.groupId === event.groupId)
    .map(({ id, name }) => ({ id, name }));

  return { status: "open", event, groupName, members, rsvps, myRsvp: null };
}

// 토큰 길이 범위(DB 함수와 같은 규칙). 범위 밖이면 RPC를 부르지 않고 무효로 처리한다.
const TOKEN_MIN_LENGTH = 32;
const TOKEN_MAX_LENGTH = 64;

// 비회원·참가자용: 토큰으로 초대 페이지 데이터를 조회한다(FR-05).
// 무효·만료 토큰이면 회차 정보를 반환하지 않고, 공개 데이터에서 연락처 메모·식별자는 제외된다(Q6, R1).
// 내 응답(myRsvp)은 로그인 상태면 계정 응답, 아니면 이 기기의 응답자 키 쿠키로 찾는다(Q11).
// 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다.
export async function getInviteByToken(token: string): Promise<InviteLookup> {
  // 마감 판정은 요청 시점 시각이 필요하므로 프리렌더에서 제외한다.
  await connection();

  if (isMockInviteToken(token)) return getMockInvite(token);
  if (token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) {
    return { status: "invalid" };
  }

  const respondentKey = await readRespondentKey();
  // 세션 유무와 관계없이 서버 클라이언트로 호출한다(세션이 있으면 authenticated, 없으면 anon 롤).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite", {
    p_token: token,
    ...(respondentKey ? { p_respondent_key: respondentKey } : {}),
  });
  if (error) readFailed("getInviteByToken", error.code);

  const lookup = parseInviteLookup(data);
  if (!lookup) readFailed("getInviteByToken", "parse");
  return lookup;
}
