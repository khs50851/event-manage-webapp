import type {
  Group,
  GroupEvent,
  GroupMember,
  GroupMembership,
  InviteToken,
  Profile,
  Rsvp,
} from "@/lib/types/domain";

// 더미 데이터. 빈 모임, 1회성 이벤트, 동명이인, 취소/종료/마감 회차, 정원 초과, 만료 토큰 같은 경계 사례를 포함한다.

// 로그인한 사용자(더미). 실제 로그인 상태면 이메일만 세션 값으로 덮어쓴다.
export const mockProfile: Profile = {
  id: "u-me",
  name: "김주최",
  email: "host@example.com",
  joinedAt: "2026-09-01",
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
];
