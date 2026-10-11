import type { Rsvp, RsvpStatus } from "@/lib/types/domain";

// 응답 상태 라벨. 색상에만 의존하지 않도록 화면에는 항상 이 텍스트를 함께 표시한다.
export const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
  attending: "참석",
  declined: "불참",
  undecided: "미정",
};

export const RSVP_STATUS_ORDER: RsvpStatus[] = [
  "attending",
  "declined",
  "undecided",
];

export type RsvpSummary = Record<RsvpStatus, Rsvp[]> & {
  // 정원을 넘긴 참석 인원(정원 미설정이면 0)
  overflow: number;
};

// 응답을 상태별로 묶고 정원 초과 인원을 계산한다(UI와 분리된 순수 함수).
export function summarizeRsvps(
  rsvps: Rsvp[],
  capacity: number | null,
): RsvpSummary {
  const summary: RsvpSummary = {
    attending: [],
    declined: [],
    undecided: [],
    overflow: 0,
  };
  for (const item of rsvps) {
    summary[item.status].push(item);
  }
  summary.overflow =
    capacity === null ? 0 : Math.max(0, summary.attending.length - capacity);
  return summary;
}

// 응답 마감 경과 여부. 두 값 모두 "YYYY-MM-DDTHH:mm" 문자열이라 사전순 비교로 충분하다.
export function isDeadlinePassed(deadline: string | null, now: string) {
  return deadline !== null && deadline <= now;
}

// 동명이인을 구분할 수 있도록 같은 이름에 순번을 붙인 표시용 라벨을 만든다.
// 비회원 화면에는 연락처 메모를 노출하지 않으므로 순번으로만 구분한다.
export function labelDuplicateNames<T extends { id: string; name: string }>(
  items: T[],
): (T & { label: string })[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.name, (totals.get(item.name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return items.map((item) => {
    const order = (seen.get(item.name) ?? 0) + 1;
    seen.set(item.name, order);
    const label =
      (totals.get(item.name) ?? 0) > 1 ? `${item.name} (${order})` : item.name;
    return { ...item, label };
  });
}
