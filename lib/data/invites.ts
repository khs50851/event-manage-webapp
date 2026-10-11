import { connection } from "next/server";

import { nowKstLocalString } from "@/lib/format";
import {
  mockEvents,
  mockGroups,
  mockInviteTokens,
  mockMembers,
  mockRsvps,
} from "@/lib/mock/data";
import { isDeadlinePassed } from "@/lib/rsvp";
import type { InviteLookup, Rsvp } from "@/lib/types/domain";

// 초대·응답 더미 조회 함수. 연동 단계(I3)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// 주최자용: 회차의 전체 응답
export async function listRsvps(eventId: string): Promise<Rsvp[]> {
  await delay();
  return mockRsvps.filter((item) => item.eventId === eventId);
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
