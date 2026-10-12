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

// ─── 정산(FR-08, FR-09, FR-10, FR-12) ───────────────────────────────

// 정산 상태: 진행 중 / 완료(모든 대상이 입금 완료로 확정됨)
export type SettlementStatus = "in_progress" | "completed";

// 정산 항목의 입금 상태: 미입금 / 참가자 자가 표시("확인 필요", FR-12) / 주최자 확정 완료
export type ShareStatus = "unpaid" | "self_reported" | "paid";

// 정산(1:1 회차). 파생값(대상 인원·1인 금액·주최자 부담 나머지·상태)도 DB 저장 형태와 맞춰 보관한다.
// 금액은 모두 원 단위 정수.
export type Settlement = {
  id: string;
  eventId: string;
  totalAmount: number;
  // 주최자 본인을 정산 인원 N에 포함하는지(Q5). 포함해도 주최자 몫은 정산 항목으로 만들지 않는다.
  hostIncluded: boolean;
  // 정산 인원 N = 정산 항목 수 + (hostIncluded ? 1 : 0)
  headCount: number;
  // floor(T/N)
  perPersonAmount: number;
  // T - floor(T/N) * N. 주최자 부담 항목으로 분리 표시한다(Q4).
  hostRemainder: number;
  // 계좌 등 입금 안내 문구
  paymentGuide: string;
  status: SettlementStatus;
  createdAt: string;
  updatedAt: string;
};

// 정산 항목(참가자별 분담). 이름은 스냅샷이라 멤버·응답이 삭제돼도 유지된다.
export type SettlementShare = {
  id: string;
  settlementId: string;
  // 응답에서 만든 항목이면 응답 id, 명부 멤버면 멤버 id(둘 다 선택)
  rsvpId: string | null;
  memberId: string | null;
  name: string;
  amount: number;
  status: ShareStatus;
  // 입금 상태 변경 시각("YYYY-MM-DDTHH:mm"). 한 번도 바뀌지 않았으면 null.
  statusChangedAt: string | null;
};

// 정산 토큰. 초대 토큰과 별개의 값이며 서로의 권한을 대신하지 못한다(FR-10).
export type SettlementToken = {
  token: string;
  settlementId: string;
  revoked: boolean;
};

// 주최자 화면용 정산 데이터(정산이 없으면 settlement가 null)
export type HostSettlementData = {
  settlement: Settlement | null;
  shares: SettlementShare[];
  // 현재 유효한 정산 토큰
  activeToken: string | null;
};

// 비회원에게 공개하는 정산 정보. 회차 id·토큰·내부 시각은 포함하지 않는다.
export type PublicSettlement = Pick<
  Settlement,
  | "id"
  | "totalAmount"
  | "hostIncluded"
  | "headCount"
  | "perPersonAmount"
  | "hostRemainder"
  | "paymentGuide"
  | "status"
>;

// 비회원 이름 선택 목록용 정산 항목(id·이름만). 금액·입금 상태는 담지 않아
// 타인의 입금 여부가 화면·DOM·RSC 페이로드 어디에도 실리지 않는다(FR-10, R1).
export type PublicSettlementShare = Pick<SettlementShare, "id" | "name">;

// 이름을 고른 뒤에만 받는 본인 항목(금액·입금 상태)
export type PublicMySettlementShare = Pick<
  SettlementShare,
  "id" | "amount" | "status"
>;

// 비회원에게 공개하는 입금 진행 집계. 특정인의 상태는 알 수 없는 인원수·비율만 담는다.
export type PublicSettlementProgress = {
  targetCount: number;
  paidCount: number;
  paidPercent: number;
  isCompleted: boolean;
};

// 정산 페이지에 보여줄 최소 회차 식별 정보. 장소·설명 등 회차 기본 정보는 정산 토큰으로 열람하지 않는다(PRD 6장 권한 매트릭스).
export type PublicSettlementEvent = Pick<GroupEvent, "title" | "startsAt">;

// 정산 토큰 조회 결과. 무효·만료 시 정산·회차 정보를 담지 않는다(FR-10).
export type SettlementLookup =
  | { status: "invalid" }
  | { status: "expired" }
  | {
      status: "active";
      settlement: PublicSettlement;
      event: PublicSettlementEvent;
      groupName: string;
      // 이름 선택용 정산 대상 목록(id·이름만, 항상 1건 이상)
      shares: PublicSettlementShare[];
      // 완납률 등 집계(특정인 상태 미포함)
      progress: PublicSettlementProgress;
    };

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
