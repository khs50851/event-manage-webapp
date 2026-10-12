import { formatDateTime, formatWon } from "@/lib/format";
import type {
  GroupMember,
  Rsvp,
  RsvpStatus,
  Settlement,
  SettlementShare,
  ShareStatus,
} from "@/lib/types/domain";

// 1/N 정산 계산·검증·상태 전이 순수 함수(U4-1, U4-2).
// UI·데이터 계층과 분리해 두어 연동 단계(I4)의 저장 로직에서도 그대로 재사용한다.
// 금액은 모두 원 단위 정수(number)로 다룬다.

// 총액 상한(오타로 자릿수가 늘어나는 실수 방지, Number 안전 정수 범위 보장)
export const SETTLEMENT_MAX_TOTAL = 100_000_000;

// 입금 안내 문구 최대 길이
export const PAYMENT_GUIDE_MAX_LENGTH = 300;

// 입금 상태 라벨. 색상에만 의존하지 않도록 화면에는 항상 이 텍스트를 함께 표시한다.
export const SHARE_STATUS_LABEL: Record<ShareStatus, string> = {
  unpaid: "미입금",
  self_reported: "확인 필요",
  paid: "입금 완료",
};

export const SETTLEMENT_STATUS_LABEL: Record<Settlement["status"], string> = {
  in_progress: "진행 중",
  completed: "완료",
};

// ─── 결과 타입과 오류 ───────────────────────────────────────────────

export type SettlementErrorCode =
  | "empty_total"
  | "invalid_total"
  | "non_positive_total"
  | "total_too_large"
  | "no_participants"
  | "invalid_participants"
  | "below_head_count";

export const SETTLEMENT_ERROR_MESSAGE: Record<SettlementErrorCode, string> = {
  empty_total: "총액을 입력해 주세요.",
  invalid_total: "총액은 소수 없이 원 단위 정수로 입력해 주세요.",
  non_positive_total: "총액은 1원 이상이어야 해요.",
  total_too_large: "총액은 1억 원 이하로 입력해 주세요.",
  no_participants: "정산 대상을 1명 이상 선택해 주세요.",
  invalid_participants: "정산 대상 인원이 올바르지 않아요.",
  below_head_count:
    "총액이 정산 인원보다 적어 1인 금액이 0원이 돼요. 총액이나 대상을 확인해 주세요.",
};

// 성공이면 value, 실패면 오류 코드와 한국어 메시지를 담는다(throw 하지 않는다).
export type SettlementResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SettlementErrorCode; message: string };

function fail<T>(code: SettlementErrorCode): SettlementResult<T> {
  return { ok: false, code, message: SETTLEMENT_ERROR_MESSAGE[code] };
}

// ─── 총액 입력 검증 ─────────────────────────────────────────────────

// 숫자 총액의 경계값 검증. 문제가 없으면 null.
export function validateTotalAmount(
  totalAmount: number,
): SettlementErrorCode | null {
  if (!Number.isFinite(totalAmount) || !Number.isInteger(totalAmount)) {
    return "invalid_total";
  }
  if (totalAmount <= 0) return "non_positive_total";
  if (totalAmount > SETTLEMENT_MAX_TOTAL) return "total_too_large";
  return null;
}

// 폼 문자열 입력("50,000", " 30000 ")을 원 단위 정수로 바꾼다. 천 단위 쉼표는 허용한다.
export function parseWonInput(raw: string): SettlementResult<number> {
  const value = raw.trim().replaceAll(",", "");
  if (value === "") return fail("empty_total");
  // 부호와 숫자만 허용(소수점·문자·지수 표기는 정수가 아니다)
  if (!/^-?\d+$/.test(value)) return fail("invalid_total");
  const amount = Number(value);
  const error = validateTotalAmount(amount);
  return error ? fail(error) : { ok: true, value: amount };
}

// ─── 1/N 계산 ───────────────────────────────────────────────────────

export type SplitInput = {
  totalAmount: number;
  // 주최자를 제외한 정산 대상(정산 항목) 수
  participantCount: number;
  // 주최자 본인을 N에 포함하는지(Q5)
  hostIncluded: boolean;
};

export type SettlementSplit = {
  totalAmount: number;
  participantCount: number;
  hostIncluded: boolean;
  // 정산 인원 N = participantCount + (hostIncluded ? 1 : 0)
  headCount: number;
  // 1인 금액 floor(T/N)
  perPersonAmount: number;
  // 나누어떨어지지 않아 남는 원(T - floor(T/N) * N). 주최자 부담 항목(Q4)
  hostRemainder: number;
  isEvenlyDivisible: boolean;
  // 참가자에게서 걷을 금액 합계(perPersonAmount * participantCount)
  collectibleAmount: number;
  // 주최자 실제 부담 = 나머지 + (본인 포함 시 1인 금액)
  hostBurden: number;
};

// floor(T/N) 1/N 계산(U4-1). 경계값(N=0, T<=0, 비정수, 1인 금액 0원)은 오류로 돌려준다(U4-2).
export function calculateSplit({
  totalAmount,
  participantCount,
  hostIncluded,
}: SplitInput): SettlementResult<SettlementSplit> {
  const totalError = validateTotalAmount(totalAmount);
  if (totalError) return fail(totalError);
  if (!Number.isInteger(participantCount) || participantCount < 0) {
    return fail("invalid_participants");
  }
  // 걷을 사람이 없으면 정산 의미가 없으므로 주최자 포함 여부와 관계없이 막는다(PRD 7장: 정산 항목 0건 없음).
  if (participantCount === 0) return fail("no_participants");

  const headCount = participantCount + (hostIncluded ? 1 : 0);
  const perPersonAmount = Math.floor(totalAmount / headCount);
  if (perPersonAmount === 0) return fail("below_head_count");

  const hostRemainder = totalAmount - perPersonAmount * headCount;
  const collectibleAmount = perPersonAmount * participantCount;

  return {
    ok: true,
    value: {
      totalAmount,
      participantCount,
      hostIncluded,
      headCount,
      perPersonAmount,
      hostRemainder,
      isEvenlyDivisible: hostRemainder === 0,
      collectibleAmount,
      hostBurden: totalAmount - collectibleAmount,
    },
  };
}

// ─── 입금 진행 상황 ─────────────────────────────────────────────────

export type SettlementProgress = {
  // 정산 대상(정산 항목) 수. 주최자 본인은 걷을 대상이 아니므로 제외한다.
  targetCount: number;
  paidCount: number;
  // 참가자가 "입금했어요"를 눌렀지만 주최자가 확정하지 않은 수(FR-12)
  selfReportedCount: number;
  unpaidCount: number;
  // 완납률 0~1(paidCount / targetCount). 대상이 없으면 0.
  paidRate: number;
  // 화면 표시용 정수 퍼센트(내림. 전원 완료 전에는 100이 되지 않는다)
  paidPercent: number;
  // 모든 대상이 입금 완료로 확정됨(FR-09). 대상 0건이면 false.
  isCompleted: boolean;
};

// 입금 상태별 집계. 자가 표시는 완료로 세지 않는다(FR-12).
export function summarizeShares(
  shares: Pick<SettlementShare, "status">[],
): SettlementProgress {
  const targetCount = shares.length;
  let paidCount = 0;
  let selfReportedCount = 0;
  for (const share of shares) {
    if (share.status === "paid") paidCount += 1;
    else if (share.status === "self_reported") selfReportedCount += 1;
  }
  const paidRate = targetCount === 0 ? 0 : paidCount / targetCount;
  return {
    targetCount,
    paidCount,
    selfReportedCount,
    unpaidCount: targetCount - paidCount - selfReportedCount,
    paidRate,
    paidPercent: Math.floor(paidRate * 100),
    isCompleted: targetCount > 0 && paidCount === targetCount,
  };
}

export type SettlementSummary = SettlementSplit & SettlementProgress;

// 저장된(또는 화면 상태의) 정산과 항목으로 계산값·진행 상황을 한 번에 만든다.
export function summarizeSettlement(
  settlement: Pick<Settlement, "totalAmount" | "hostIncluded">,
  shares: Pick<SettlementShare, "status">[],
): SettlementResult<SettlementSummary> {
  const split = calculateSplit({
    totalAmount: settlement.totalAmount,
    participantCount: shares.length,
    hostIncluded: settlement.hostIncluded,
  });
  if (!split.ok) return split;
  return { ok: true, value: { ...split.value, ...summarizeShares(shares) } };
}

// ─── 정산 대상 후보 ─────────────────────────────────────────────────

// 주최자 화면의 정산 대상 후보(응답자 + 응답하지 않은 명부 멤버 + 기존 항목에만 남은 이름).
// 주최자 전용이라 연락처 메모를 포함한다(동명이인 구분용). 비회원 화면에는 넘기지 않는다.
export type SettlementCandidate = {
  // 후보 식별 키: "rsvp:<id>" | "member:<id>" | "share:<id>"
  key: string;
  rsvpId: string | null;
  memberId: string | null;
  name: string;
  // 응답 상태. 응답하지 않은 명부 멤버·기존 항목이면 null.
  rsvpStatus: RsvpStatus | null;
  memo: string;
};

// 정산 항목이 어떤 후보에서 왔는지 나타내는 키
export function candidateKeyOfShare(
  share: Pick<SettlementShare, "id" | "rsvpId" | "memberId">,
): string {
  if (share.rsvpId) return `rsvp:${share.rsvpId}`;
  if (share.memberId) return `member:${share.memberId}`;
  return `share:${share.id}`;
}

const CANDIDATE_ORDER: Record<RsvpStatus, number> = {
  attending: 0,
  undecided: 1,
  declined: 2,
};

// 대상 후보 목록. 순서: 참석 → 미정 → 불참 → 미응답 멤버 → 기존 항목에만 있는 이름.
export function buildSettlementCandidates(
  rsvps: Rsvp[],
  members: GroupMember[],
  shares: SettlementShare[] = [],
): SettlementCandidate[] {
  const memoById = new Map(members.map((member) => [member.id, member.memo]));

  const fromRsvps: SettlementCandidate[] = [...rsvps]
    .sort((a, b) => CANDIDATE_ORDER[a.status] - CANDIDATE_ORDER[b.status])
    .map((item) => ({
      key: `rsvp:${item.id}`,
      rsvpId: item.id,
      memberId: item.memberId,
      name: item.name,
      rsvpStatus: item.status,
      memo: item.memberId ? (memoById.get(item.memberId) ?? "") : "",
    }));

  const respondedMemberIds = new Set(
    rsvps.map((item) => item.memberId).filter(Boolean),
  );
  const fromMembers: SettlementCandidate[] = members
    .filter((member) => !respondedMemberIds.has(member.id))
    .map((member) => ({
      key: `member:${member.id}`,
      rsvpId: null,
      memberId: member.id,
      name: member.name,
      rsvpStatus: null,
      memo: member.memo,
    }));

  // 응답·멤버가 삭제돼 후보에 없는 기존 항목도 대상 목록에서 사라지지 않게 남긴다(이름 스냅샷).
  const knownKeys = new Set(
    [...fromRsvps, ...fromMembers].map((item) => item.key),
  );
  const fromShares: SettlementCandidate[] = shares
    .filter((share) => !knownKeys.has(candidateKeyOfShare(share)))
    .map((share) => ({
      key: candidateKeyOfShare(share),
      rsvpId: share.rsvpId,
      memberId: share.memberId,
      name: share.name,
      rsvpStatus: null,
      memo: "",
    }));

  return [...fromRsvps, ...fromMembers, ...fromShares];
}

// 정산을 처음 만들 때의 기본 대상: "참석" 응답자(FR-08)
export function defaultTargetKeys(candidates: SettlementCandidate[]): string[] {
  return candidates
    .filter((item) => item.rsvpStatus === "attending")
    .map((item) => item.key);
}

// 기존 정산 항목에 해당하는 후보 키 목록(대상 선택 UI의 초기값)
export function targetKeysOfShares(shares: SettlementShare[]): string[] {
  return shares.map(candidateKeyOfShare);
}

// ─── 정산 생성·재계산 ───────────────────────────────────────────────

// 정산 폼 + 대상 선택으로 만든 입력값
export type SettlementDraft = {
  totalAmount: number;
  hostIncluded: boolean;
  paymentGuide: string;
  targetKeys: string[];
};

export type BuildSettlementInput = {
  eventId: string;
  // 기존 정산(새로 만들 때는 null)
  previous: { settlement: Settlement; shares: SettlementShare[] } | null;
  candidates: SettlementCandidate[];
  draft: SettlementDraft;
  // 현재 시각 "YYYY-MM-DDTHH:mm"(호출하는 쪽에서 넘겨 함수를 순수하게 유지)
  now: string;
  // 새 id 생성기(테스트·서버 저장 시 교체 가능)
  createId?: () => string;
};

// 정산 생성과 총액·대상 변경 후 재계산(FR-08, U4-4, U4-6).
// 유지되는 대상의 입금 상태·변경 시각은 그대로 두고 금액만 새 1인 금액으로 바꾼다.
export function buildSettlement({
  eventId,
  previous,
  candidates,
  draft,
  now,
  createId = () => crypto.randomUUID(),
}: BuildSettlementInput): SettlementResult<{
  settlement: Settlement;
  shares: SettlementShare[];
}> {
  const candidateByKey = new Map(candidates.map((item) => [item.key, item]));
  const targets = [...new Set(draft.targetKeys)]
    .map((key) => candidateByKey.get(key))
    .filter((item): item is SettlementCandidate => item !== undefined);

  const split = calculateSplit({
    totalAmount: draft.totalAmount,
    participantCount: targets.length,
    hostIncluded: draft.hostIncluded,
  });
  if (!split.ok) return split;

  const settlementId = previous?.settlement.id ?? `st-${createId()}`;
  const previousByKey = new Map(
    (previous?.shares ?? []).map((share) => [
      candidateKeyOfShare(share),
      share,
    ]),
  );

  const shares: SettlementShare[] = targets.map((target) => {
    const kept = previousByKey.get(target.key);
    if (kept) {
      return { ...kept, amount: split.value.perPersonAmount };
    }
    return {
      id: `ss-${createId()}`,
      settlementId,
      rsvpId: target.rsvpId,
      memberId: target.memberId,
      name: target.name,
      amount: split.value.perPersonAmount,
      status: "unpaid",
      statusChangedAt: null,
    };
  });

  const settlement: Settlement = {
    id: settlementId,
    eventId,
    totalAmount: split.value.totalAmount,
    hostIncluded: split.value.hostIncluded,
    headCount: split.value.headCount,
    perPersonAmount: split.value.perPersonAmount,
    hostRemainder: split.value.hostRemainder,
    paymentGuide: draft.paymentGuide.trim(),
    status: summarizeShares(shares).isCompleted ? "completed" : "in_progress",
    createdAt: previous?.settlement.createdAt ?? now,
    updatedAt: now,
  };

  return { ok: true, value: { settlement, shares } };
}

// 입금 완료 항목이 1건이라도 있는지(총액·대상 변경 경고 조건, FR-08)
export function hasPaidShares(shares: Pick<SettlementShare, "status">[]) {
  return shares.some((share) => share.status === "paid");
}

// 금액 분배에 영향을 주는 변경(총액·주최자 포함·대상)인지. 안내 문구만 바꾸면 false.
export function isSplitChanged(
  settlement: Pick<Settlement, "totalAmount" | "hostIncluded">,
  shares: SettlementShare[],
  draft: Omit<SettlementDraft, "paymentGuide">,
): boolean {
  if (settlement.totalAmount !== draft.totalAmount) return true;
  if (settlement.hostIncluded !== draft.hostIncluded) return true;
  const before = new Set(targetKeysOfShares(shares));
  const after = new Set(draft.targetKeys);
  return (
    before.size !== after.size || [...after].some((key) => !before.has(key))
  );
}

// 변경 전 확인 경고가 필요한지(입금 완료가 있고 분배가 바뀌는 경우, U4-6)
export function needsChangeConfirmation(
  previous: { settlement: Settlement; shares: SettlementShare[] } | null,
  draft: Omit<SettlementDraft, "paymentGuide">,
): boolean {
  if (!previous) return false;
  return (
    hasPaidShares(previous.shares) &&
    isSplitChanged(previous.settlement, previous.shares, draft)
  );
}

// ─── 입금 상태 전이 ─────────────────────────────────────────────────

// 주최자 토글(FR-09): 입금 완료 ↔ 미입금. 자가 표시("확인 필요")는 토글하면 완료로 확정한다.
export function toggleSharePaid(
  share: SettlementShare,
  now: string,
): SettlementShare {
  const status: ShareStatus = share.status === "paid" ? "unpaid" : "paid";
  return { ...share, status, statusChangedAt: now };
}

// 참가자 "입금했어요"(FR-12): 미입금일 때만 "확인 필요"로 바뀐다. 완료 확정은 주최자만 한다.
export function markSelfReported<
  T extends Pick<SettlementShare, "status"> & {
    statusChangedAt?: string | null;
  },
>(share: T, now: string): T {
  if (share.status !== "unpaid") return share;
  return { ...share, status: "self_reported", statusChangedAt: now };
}

// 항목 상태가 바뀐 뒤 정산 상태(진행 중/완료)를 다시 맞춘다(FR-09).
export function withDerivedStatus(
  settlement: Settlement,
  shares: Pick<SettlementShare, "status">[],
  now: string,
): Settlement {
  const status = summarizeShares(shares).isCompleted
    ? "completed"
    : "in_progress";
  if (status === settlement.status) return settlement;
  return { ...settlement, status, updatedAt: now };
}

// ─── 요약 문구(FR-14) ───────────────────────────────────────────────

export type SettlementSummaryTextInput = {
  groupName: string;
  eventTitle: string;
  startsAt: string;
  totalAmount: number;
  headCount: number;
  hostIncluded: boolean;
  perPersonAmount: number;
  paymentGuide: string;
  // 정산 조회 링크(절대 URL)
  url: string;
};

// 메신저 붙여넣기용 한국어 요약 문구
export function buildSettlementSummaryText(
  input: SettlementSummaryTextInput,
): string {
  const title = input.groupName
    ? `[${input.groupName}] ${input.eventTitle}`
    : input.eventTitle;
  return [
    `${title} 정산 안내`,
    `일시: ${formatDateTime(input.startsAt)}`,
    `총액: ${formatWon(input.totalAmount)} / ${input.headCount}명${input.hostIncluded ? "(주최자 포함)" : ""}`,
    `1인 금액: ${formatWon(input.perPersonAmount)}`,
    `입금 안내: ${input.paymentGuide}`,
    `정산 확인: ${input.url}`,
  ].join("\n");
}
