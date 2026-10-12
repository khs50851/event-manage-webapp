import type {
  Group,
  GroupEvent,
  GroupMember,
  GroupMembership,
  InviteToken,
  Profile,
  Rsvp,
  Settlement,
  SettlementShare,
  SettlementToken,
} from "@/lib/types/domain";

// 더미 데이터. 빈 모임, 1회성 이벤트, 동명이인, 취소/종료/마감 회차, 정원 초과, 만료 토큰 같은 경계 사례를 포함한다.

// 로그인한 사용자(더미). 실제 로그인 상태면 이메일만 세션 값으로 덮어쓴다.
export const mockProfile: Profile = {
  id: "u-me",
  name: "김주최",
  email: "host@example.com",
  joinedAt: "2026-09-01",
  avatarUrl: null,
};

export const mockGroups: Group[] = [
  {
    id: "g-swim",
    name: "화요 수영반",
    description: "매주 화요일 저녁 수영 모임",
    isOneOff: false,
  },
  {
    id: "g-futsal",
    name: "금요 풋살",
    description: "",
    isOneOff: false,
  },
  {
    id: "g-oneoff",
    name: "연말 송년회",
    description: "",
    isOneOff: true,
  },
  {
    id: "g-empty",
    name: "새 모임",
    description: "회차와 멤버가 없는 빈 모임",
    isOneOff: false,
  },
  // 아래 두 모임은 다른 사람이 만들고 내가 참여만 한 모임이다(mockMemberships 참고)
  {
    id: "g-hiking",
    name: "주말 등산 모임",
    description: "격주 토요일 오전 근교 산행",
    isOneOff: false,
  },
  {
    id: "g-book",
    name: "월간 독서 모임",
    description: "",
    isOneOff: false,
  },
];

// 사용자-모임 관계. 내가 만든 모임 4개, 참여한 모임 2개.
export const mockMemberships: GroupMembership[] = [
  { userId: "u-me", groupId: "g-swim", role: "host" },
  { userId: "u-me", groupId: "g-futsal", role: "host" },
  { userId: "u-me", groupId: "g-oneoff", role: "host" },
  { userId: "u-me", groupId: "g-empty", role: "host" },
  { userId: "u-me", groupId: "g-hiking", role: "member" },
  { userId: "u-me", groupId: "g-book", role: "member" },
];

export const mockMembers: GroupMember[] = [
  { id: "m-1", groupId: "g-swim", name: "김민수", memo: "" },
  { id: "m-2", groupId: "g-swim", name: "이서연", memo: "총무" },
  { id: "m-3", groupId: "g-swim", name: "박지훈", memo: "" },
  // 동명이인 경계 사례
  { id: "m-4", groupId: "g-swim", name: "김민수", memo: "수영 초보" },
  { id: "m-5", groupId: "g-swim", name: "최유진", memo: "" },
  { id: "m-6", groupId: "g-futsal", name: "정우성", memo: "" },
  { id: "m-7", groupId: "g-futsal", name: "한지민", memo: "골키퍼" },
  { id: "m-8", groupId: "g-futsal", name: "오세훈", memo: "" },
];

export const mockEvents: GroupEvent[] = [
  {
    id: "e-swim-1",
    groupId: "g-swim",
    title: "10월 2주차 수영",
    startsAt: "2026-10-13T19:00",
    location: "구립 체육센터 수영장",
    capacity: 12,
    description: "수영모, 수경 지참",
    rsvpDeadline: "2026-10-13T12:00",
    status: "scheduled",
  },
  {
    id: "e-swim-2",
    groupId: "g-swim",
    title: "10월 3주차 수영",
    startsAt: "2026-10-20T19:00",
    location: "구립 체육센터 수영장",
    capacity: null,
    description: "",
    rsvpDeadline: null,
    status: "scheduled",
  },
  {
    id: "e-swim-3",
    groupId: "g-swim",
    title: "10월 1주차 수영",
    startsAt: "2026-10-06T19:00",
    location: "구립 체육센터 수영장",
    capacity: 12,
    description: "",
    rsvpDeadline: null,
    status: "ended",
  },
  {
    id: "e-swim-4",
    groupId: "g-swim",
    title: "10월 4주차 수영",
    startsAt: "2026-10-27T19:00",
    location: "구립 체육센터 수영장",
    capacity: 12,
    description: "센터 휴관으로 취소",
    rsvpDeadline: null,
    status: "cancelled",
  },
  {
    id: "e-futsal-1",
    groupId: "g-futsal",
    title: "금요 풋살 정기전",
    startsAt: "2026-10-16T20:00",
    location: "OO 풋살파크 2구장",
    capacity: 10,
    description: "",
    rsvpDeadline: "2026-10-15T18:00",
    status: "scheduled",
  },
  {
    id: "e-futsal-2",
    groupId: "g-futsal",
    title: "금요 풋살 친선전",
    startsAt: "2026-10-23T20:00",
    location: "OO 풋살파크 1구장",
    capacity: 10,
    // 응답 마감이 지난 예정 회차(마감 경계 사례)
    description: "상대 팀과 인원 확정 완료",
    rsvpDeadline: "2026-10-10T18:00",
    status: "scheduled",
  },
  {
    // 정산 전원 완료 경계 사례용 종료 회차
    id: "e-futsal-3",
    groupId: "g-futsal",
    title: "금요 풋살 9월 정기전",
    startsAt: "2026-09-25T20:00",
    location: "OO 풋살파크 2구장",
    capacity: 10,
    description: "",
    rsvpDeadline: null,
    status: "ended",
  },
  {
    id: "e-oneoff-1",
    groupId: "g-oneoff",
    title: "연말 송년회",
    startsAt: "2026-12-20T18:30",
    location: "강남역 근처 식당",
    capacity: 20,
    description: "",
    rsvpDeadline: "2026-12-15T23:59",
    status: "scheduled",
  },
];

// 초대 토큰 더미. 실제 토큰은 128비트 이상 무작위 값이지만(FR-05), 화면 확인 편의를 위해 읽기 쉬운 값을 쓴다.
export const mockInviteTokens: InviteToken[] = [
  { token: "demo-swim-1", eventId: "e-swim-1", revoked: false },
  // 재발급으로 만료된 이전 토큰
  { token: "demo-swim-1-old", eventId: "e-swim-1", revoked: true },
  { token: "demo-swim-2", eventId: "e-swim-2", revoked: false },
  { token: "demo-swim-3", eventId: "e-swim-3", revoked: false },
  { token: "demo-swim-4", eventId: "e-swim-4", revoked: false },
  { token: "demo-futsal-1", eventId: "e-futsal-1", revoked: false },
  { token: "demo-futsal-2", eventId: "e-futsal-2", revoked: false },
  { token: "demo-futsal-3", eventId: "e-futsal-3", revoked: false },
  { token: "demo-oneoff-1", eventId: "e-oneoff-1", revoked: false },
];

function rsvp(
  id: string,
  eventId: string,
  name: string,
  status: Rsvp["status"],
  options: { memberId?: string; source?: Rsvp["source"] } = {},
): Rsvp {
  return {
    id,
    eventId,
    memberId: options.memberId ?? null,
    name,
    status,
    source: options.source ?? "self",
    respondedAt: "2026-10-09T21:00",
  };
}

// 응답 더미. e-futsal-1은 정원(10) 초과, e-swim-2는 응답 0건 경계 사례다.
export const mockRsvps: Rsvp[] = [
  rsvp("r-1", "e-swim-1", "김민수", "attending", { memberId: "m-1" }),
  rsvp("r-2", "e-swim-1", "이서연", "attending", { memberId: "m-2" }),
  rsvp("r-3", "e-swim-1", "박지훈", "declined", {
    memberId: "m-3",
    source: "host",
  }),
  rsvp("r-4", "e-swim-1", "강하늘", "attending"),
  rsvp("r-5", "e-swim-1", "윤아름", "undecided"),
  rsvp("r-6", "e-swim-3", "김민수", "attending", { memberId: "m-1" }),
  rsvp("r-7", "e-swim-3", "최유진", "attending", { memberId: "m-5" }),
  rsvp("r-8", "e-futsal-1", "정우성", "attending", { memberId: "m-6" }),
  rsvp("r-9", "e-futsal-1", "한지민", "attending", { memberId: "m-7" }),
  ...[
    "강동원",
    "송강",
    "이도현",
    "박보검",
    "차은우",
    "남주혁",
    "김선호",
    "서강준",
    "안효섭",
  ].map((name, index) =>
    rsvp(`r-futsal-${index}`, "e-futsal-1", name, "attending"),
  ),
  rsvp("r-10", "e-futsal-1", "유연석", "declined"),
  rsvp("r-11", "e-futsal-2", "정우성", "attending", { memberId: "m-6" }),
  rsvp("r-12", "e-futsal-2", "한지민", "declined", { memberId: "m-7" }),
  rsvp("r-13", "e-oneoff-1", "박서준", "attending"),
  rsvp("r-14", "e-oneoff-1", "김지원", "undecided"),
  rsvp("r-15", "e-futsal-3", "정우성", "attending", { memberId: "m-6" }),
  rsvp("r-16", "e-futsal-3", "한지민", "attending", { memberId: "m-7" }),
  rsvp("r-17", "e-futsal-3", "오세훈", "attending", { memberId: "m-8" }),
  rsvp("r-18", "e-futsal-3", "강동원", "attending"),
];

// ─── 정산 더미 ──────────────────────────────────────────────────────
// 경계 사례:
// - 정산 없음: e-swim-1(참석 3명, "정산 만들기" 흐름), e-swim-2(응답 0건 → 대상 0명 오류 확인)
// - 나누어떨어지지 않음 + 일부 입금 + 자가 입금 표시: e-swim-3 (25,000원 / 3명(주최자 포함) = 8,333원, 나머지 1원)
// - 나누어떨어짐 + 일부 입금: e-futsal-1 (110,000원 / 11명 = 10,000원)
// - 전원 완료: e-futsal-3 (80,000원 / 5명(주최자 포함) = 16,000원)
// 파생값(N, 1인 금액, 나머지, 상태)은 calculateSplit과 같은 규칙으로 아래 헬퍼가 채운다.

type ShareFixture = {
  rsvpId: string;
  status: SettlementShare["status"];
  statusChangedAt?: string;
};

function settlementFixture(
  id: string,
  eventId: string,
  options: {
    totalAmount: number;
    hostIncluded: boolean;
    paymentGuide: string;
    createdAt: string;
    shares: ShareFixture[];
  },
): { settlement: Settlement; shares: SettlementShare[] } {
  const headCount = options.shares.length + (options.hostIncluded ? 1 : 0);
  const perPersonAmount = Math.floor(options.totalAmount / headCount);
  const shares = options.shares.map((item, index): SettlementShare => {
    const source = mockRsvps.find((r) => r.id === item.rsvpId);
    return {
      id: `${id}-share-${index + 1}`,
      settlementId: id,
      rsvpId: item.rsvpId,
      memberId: source?.memberId ?? null,
      name: source?.name ?? "",
      amount: perPersonAmount,
      status: item.status,
      statusChangedAt: item.statusChangedAt ?? null,
    };
  });
  return {
    settlement: {
      id,
      eventId,
      totalAmount: options.totalAmount,
      hostIncluded: options.hostIncluded,
      headCount,
      perPersonAmount,
      hostRemainder: options.totalAmount - perPersonAmount * headCount,
      paymentGuide: options.paymentGuide,
      status: shares.every((share) => share.status === "paid")
        ? "completed"
        : "in_progress",
      createdAt: options.createdAt,
      updatedAt: options.createdAt,
    },
    shares,
  };
}

const settlementFixtures = [
  settlementFixture("st-swim-3", "e-swim-3", {
    totalAmount: 25_000,
    hostIncluded: true,
    paymentGuide: "카카오뱅크 3333-01-1234567 김주최 (레인 대여비)",
    createdAt: "2026-10-07T09:00",
    shares: [
      { rsvpId: "r-6", status: "paid", statusChangedAt: "2026-10-07T12:30" },
      // 참가자가 "입금했어요"를 눌렀지만 주최자가 아직 확정하지 않은 항목(FR-12)
      {
        rsvpId: "r-7",
        status: "self_reported",
        statusChangedAt: "2026-10-08T21:10",
      },
    ],
  }),
  settlementFixture("st-futsal-1", "e-futsal-1", {
    totalAmount: 110_000,
    hostIncluded: false,
    paymentGuide:
      "토스뱅크 1000-1234-5678 김주최\n구장 대여비 선입금 부탁드려요.",
    createdAt: "2026-10-10T10:00",
    shares: [
      { rsvpId: "r-8", status: "paid", statusChangedAt: "2026-10-10T11:00" },
      { rsvpId: "r-9", status: "paid", statusChangedAt: "2026-10-10T11:05" },
      {
        rsvpId: "r-futsal-0",
        status: "paid",
        statusChangedAt: "2026-10-10T13:20",
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        rsvpId: `r-futsal-${index + 1}`,
        status: "unpaid" as const,
      })),
    ],
  }),
  settlementFixture("st-futsal-3", "e-futsal-3", {
    totalAmount: 80_000,
    hostIncluded: true,
    paymentGuide: "토스뱅크 1000-1234-5678 김주최",
    createdAt: "2026-09-26T09:00",
    shares: ["r-15", "r-16", "r-17", "r-18"].map((rsvpId) => ({
      rsvpId,
      status: "paid" as const,
      statusChangedAt: "2026-09-27T20:00",
    })),
  }),
];

export const mockSettlements: Settlement[] = settlementFixtures.map(
  (item) => item.settlement,
);

export const mockSettlementShares: SettlementShare[] =
  settlementFixtures.flatMap((item) => item.shares);

// 정산 토큰 더미. 초대 토큰(demo-*)과 겹치지 않는 별개의 값이다(FR-10).
export const mockSettlementTokens: SettlementToken[] = [
  { token: "settle-swim-3", settlementId: "st-swim-3", revoked: false },
  // 재발급으로 만료된 이전 정산 토큰
  { token: "settle-swim-3-old", settlementId: "st-swim-3", revoked: true },
  { token: "settle-futsal-1", settlementId: "st-futsal-1", revoked: false },
  { token: "settle-futsal-3", settlementId: "st-futsal-3", revoked: false },
];
