import { connection } from "next/server";

import { buildDashboard, type DashboardSummary } from "@/lib/dashboard";
import {
  EVENT_COLUMNS,
  GROUP_COLUMNS,
  MEMBER_COLUMNS,
  RSVP_COLUMNS,
  SETTLEMENT_COLUMNS,
  SHARE_COLUMNS,
  toGroup,
  toGroupEvent,
  toGroupMember,
  toRsvp,
  toSettlement,
  toSettlementShare,
} from "@/lib/data/mappers";
import {
  mockDelay,
  resolveDataSource,
  type ServerSupabaseClient,
} from "@/lib/data/source";
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

// 대시보드 조회 함수. 세션이 있으면 Supabase(RLS: 본인 소유 모임 하위 데이터만), 없으면 개발 환경에서만 더미.
// 집계는 lib/dashboard.ts의 buildDashboard가 담당하고 여기서는 원본만 모은다(집계 기준은 그쪽에서만 바꾼다).

export type DashboardData = DashboardSummary & {
  // 대시보드 하단 "내 모임"/"참여한 모임" 목록
  hostedGroups: Group[];
  joinedGroups: Group[];
};

export type GetDashboardOptions = {
  // 개발 환경 전용 미리보기: "empty"면 모임 0건인 빈 대시보드를 돌려준다(더미 경로에서만).
  // 프로덕션과 실데이터 경로에서는 무시한다. 연동 단계(I2-6, 목업 미리보기 제거)에서 함께 제거한다.
  preview?: string;
};

function emptyDashboard(now: string): DashboardData {
  return {
    ...buildDashboard({
      hostedGroups: [],
      events: [],
      members: [],
      rsvps: [],
      settlements: [],
      shares: [],
      now,
    }),
    hostedGroups: [],
    joinedGroups: [],
  };
}

// ─── 더미 경로 ──────────────────────────────────────────────
function mockGroupsByRole(role: GroupRole): Group[] {
  return mockMemberships
    .filter((item) => item.userId === mockProfile.id && item.role === role)
    .map((item) => mockGroups.find((group) => group.id === item.groupId))
    .filter((group): group is Group => group !== undefined);
}

async function getMockDashboard(
  options: GetDashboardOptions,
  now: string,
): Promise<DashboardData> {
  await mockDelay();
  if (options.preview === "empty") return emptyDashboard(now);

  const hostedGroups = mockGroupsByRole("host");
  const joinedGroups = mockGroupsByRole("member");

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
    now,
  });

  return { ...summary, hostedGroups, joinedGroups };
}

// ─── 실데이터 경로 ────────────────────────────────────────────
// RLS가 소유자 행만 돌려주므로 세 쿼리를 병렬로 보낸다(하위 테이블 임베드에도 RLS가 그대로 적용된다).
async function getSupabaseDashboard(
  supabase: ServerSupabaseClient,
  now: string,
): Promise<DashboardData> {
  const [groupsResult, rsvpsResult, settlementsResult] = await Promise.all([
    supabase
      .from("groups")
      .select(
        `${GROUP_COLUMNS}, events(${EVENT_COLUMNS}), group_members(${MEMBER_COLUMNS})`,
      )
      .order("created_at", { ascending: true }),
    supabase.from("rsvps").select(RSVP_COLUMNS),
    supabase
      .from("settlements")
      .select(`${SETTLEMENT_COLUMNS}, settlement_shares(${SHARE_COLUMNS})`),
  ]);

  const error =
    groupsResult.error ?? rsvpsResult.error ?? settlementsResult.error;
  if (error) {
    console.error("[getDashboard] 조회 실패:", error.code);
    throw new Error("데이터를 불러오지 못했어요.");
  }

  const groupRows = groupsResult.data ?? [];
  const settlementRows = settlementsResult.data ?? [];

  const hostedGroups = groupRows.map(toGroup);
  const summary = buildDashboard({
    hostedGroups,
    events: groupRows.flatMap((row) => row.events.map(toGroupEvent)),
    members: groupRows.flatMap((row) => row.group_members.map(toGroupMember)),
    rsvps: (rsvpsResult.data ?? []).map(toRsvp),
    settlements: settlementRows.map(toSettlement),
    shares: settlementRows.flatMap((row) =>
      row.settlement_shares.map(toSettlementShare),
    ),
    now,
  });

  // 참여한 모임은 I3-6a 전까지 빈 목록(Q12)
  return { ...summary, hostedGroups, joinedGroups: [] };
}

// 로그인 주최자의 대시보드 데이터(FR-11).
// 7일 이내·마감·미입금 판정이 요청 시점 시각에 달려 있으므로 프리렌더에서 제외한다.
export async function getDashboard(
  options: GetDashboardOptions = {},
): Promise<DashboardData> {
  await connection();
  const now = nowKstLocalString();

  const source = await resolveDataSource();
  if (source.kind === "mock") return getMockDashboard(options, now);
  if (source.kind === "none") return emptyDashboard(now);
  return getSupabaseDashboard(source.supabase, now);
}
