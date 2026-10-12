import { connection } from "next/server";

import { buildDashboard, type DashboardSummary } from "@/lib/dashboard";
import { nowKstLocalString } from "@/lib/format";
import {
  mockEvents,
  mockGroups,
  mockMembers,
  mockMemberships,
  mockProfile,
  mockRsvps,
  mockSettlements,
  mockSettlementShares,
} from "@/lib/mock/data";
import type { Group, GroupRole } from "@/lib/types/domain";

// 대시보드 더미 조회 함수. 연동 단계(I1~I4)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function groupsByRole(role: GroupRole): Group[] {
  return mockMemberships
    .filter((item) => item.userId === mockProfile.id && item.role === role)
    .map((item) => mockGroups.find((group) => group.id === item.groupId))
    .filter((group): group is Group => group !== undefined);
}

export type DashboardData = DashboardSummary & {
  // 대시보드 하단 "내 모임"/"참여한 모임" 목록
  hostedGroups: Group[];
  joinedGroups: Group[];
};

export type GetDashboardOptions = {
  // 개발 환경 전용 미리보기: "empty"면 모임 0건인 빈 대시보드를 돌려준다.
  // 프로덕션에서는 무시한다. 연동 단계(I2-6, 목업 미리보기 제거)에서 함께 제거한다.
  preview?: string;
};

// 로그인 주최자의 대시보드 데이터(FR-11).
// 7일 이내·마감·미입금 판정이 요청 시점 시각에 달려 있으므로 프리렌더에서 제외한다.
export async function getDashboard(
  options: GetDashboardOptions = {},
): Promise<DashboardData> {
  await connection();
  await delay();

  const isEmptyPreview =
    process.env.NODE_ENV !== "production" && options.preview === "empty";
  const hostedGroups = isEmptyPreview ? [] : groupsByRole("host");
  const joinedGroups = isEmptyPreview ? [] : groupsByRole("member");

  const hostedGroupIds = new Set(hostedGroups.map((group) => group.id));
  const events = mockEvents.filter((event) =>
    hostedGroupIds.has(event.groupId),
  );
  const eventIds = new Set(events.map((event) => event.id));
  const settlements = mockSettlements.filter((item) =>
    eventIds.has(item.eventId),
  );
  const settlementIds = new Set(settlements.map((item) => item.id));

  const summary = buildDashboard({
    hostedGroups,
    events,
    members: mockMembers.filter((member) => hostedGroupIds.has(member.groupId)),
    rsvps: mockRsvps.filter((item) => eventIds.has(item.eventId)),
    settlements,
    shares: mockSettlementShares.filter((share) =>
      settlementIds.has(share.settlementId),
    ),
    now: nowKstLocalString(),
  });

  return { ...summary, hostedGroups, joinedGroups };
}
