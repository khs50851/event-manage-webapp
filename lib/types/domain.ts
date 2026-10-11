// 도메인 타입 (PRD 6장 엔티티 기준). 연동 단계(I1)에서 생성 타입으로 교체한다.

export type EventStatus = "scheduled" | "cancelled" | "ended";

export type Group = {
  id: string;
  name: string;
  description: string;
  // 멤버 0명 + 회차 1개로 만든 1회성 이벤트 여부
  isOneOff: boolean;
};

// 로그인한 사용자 프로필. 연동 단계(I1)에서 profiles 테이블/Auth 사용자 정보로 교체한다.
export type Profile = {
  id: string;
  name: string;
  email: string;
  // 가입일 "YYYY-MM-DD"
  joinedAt: string;
};

// 사용자와 모임의 관계: 직접 만든 모임(host) / 참여한 모임(member)
export type GroupRole = "host" | "member";

export type GroupMembership = {
  userId: string;
  groupId: string;
  role: GroupRole;
};

// 내 정보 화면 통계
export type MyStats = {
  hostedCount: number;
  joinedCount: number;
};

export type GroupMember = {
  id: string;
  groupId: string;
  name: string;
  memo: string;
};

export type GroupEvent = {
  id: string;
  groupId: string;
  title: string;
  // 타임존 변환을 피하려고 "YYYY-MM-DDTHH:mm" 형태의 로컬 문자열로 보관한다.
  startsAt: string;
  location: string;
  capacity: number | null;
  description: string;
  rsvpDeadline: string | null;
  status: EventStatus;
};

export type RsvpStatus = "attending" | "declined" | "undecided";

// 응답 출처: 참가자 본인 제출 / 주최자 대리 입력(R3)
export type RsvpSource = "self" | "host";

export type Rsvp = {
  id: string;
  eventId: string;
  // 명부에서 이름을 고른 경우의 멤버 id. 직접 입력이면 null.
  memberId: string | null;
  // 응답 시점 이름 스냅샷(명부에서 멤버가 삭제돼도 유지)
  name: string;
  status: RsvpStatus;
  source: RsvpSource;
  respondedAt: string;
};

// 회차별 초대 토큰(Q1: 회차 단위). 재발급되면 이전 토큰은 revoked가 된다.
export type InviteToken = {
  token: string;
  eventId: string;
  revoked: boolean;
};

// 비회원에게 공개하는 멤버 정보. 연락처 메모는 포함하지 않는다(Q6, R1).
export type PublicMember = Pick<GroupMember, "id" | "name">;

// 초대 토큰 조회 결과. 무효·만료 시 회차 정보를 담지 않는다(FR-05).
export type InviteLookup =
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "cancelled"; event: GroupEvent; groupName: string }
  | {
      status: "closed";
      reason: "deadline" | "ended";
      event: GroupEvent;
      groupName: string;
      rsvps: Rsvp[];
    }
  | {
      status: "open";
      event: GroupEvent;
      groupName: string;
      members: PublicMember[];
      rsvps: Rsvp[];
    };
