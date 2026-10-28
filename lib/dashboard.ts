import { padTwo } from "@/lib/format";
import { isDeadlinePassed, summarizeRsvps } from "@/lib/rsvp";
import { summarizeShares } from "@/lib/settlement";
import type {
  Group,
  GroupEvent,
  GroupMember,
  Rsvp,
  Settlement,
  SettlementShare,
} from "@/lib/types/domain";

// 대시보드 집계 순수 함수(FR-11, U5-1).
// 데이터 계층(lib/data/dashboard.ts)이 모은 원본을 받아 카드 3개에 필요한 값만 계산한다.
// 현재 시각은 호출하는 쪽에서 "YYYY-MM-DDTHH:mm"(한국 시간)으로 넘겨 함수를 순수하게 유지한다.

// 다가오는 회차 기준 기간(PRD A8: 7일)
export const UPCOMING_WINDOW_DAYS = 7;

// "YYYY-MM-DDTHH:mm" 로컬 문자열에 일수를 더한다. 타임존 영향을 피하려고 UTC 기준으로만 계산한다.
export function addDaysToLocalString(value: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Date.UTC(+year, +month - 1, +day + days, +hour, +minute),
  );
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}T${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}`;
}

// 카드 항목 공통: 이동 링크와 표시용 회차 정보
type DashboardEventRef = {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  groupName: string;
};

export type UpcomingEventItem = DashboardEventRef & {
  attendingCount: number;
  capacity: number | null;
};

export type PendingRsvpItem = DashboardEventRef & {
  // 명부 멤버 중 아직 응답하지 않은 인원
  pendingCount: number;
  // 응답은 했지만 "미정"인 인원(참고 표시용, 판정에는 쓰지 않는다)
  undecidedCount: number;
};

export type UnpaidSettlementItem = DashboardEventRef & {
  settlementId: string;
  unpaidCount: number;
  // 참가자가 "입금했어요"를 눌렀지만 주최자가 확정하지 않은 인원(FR-12)
  selfReportedCount: number;
  targetCount: number;
};

export type DashboardSummary = {
  // 내가 만든 모임 수. 0이면 빈 대시보드("모임 만들기" CTA)를 보여준다.
  hostedGroupCount: number;
  upcomingEvents: UpcomingEventItem[];
  pendingRsvpEvents: PendingRsvpItem[];
  unpaidSettlements: UnpaidSettlementItem[];
};

export type BuildDashboardInput = {
  // 내가 주최하는 모임만 넘긴다(다른 사람 모임의 회차·정산은 집계하지 않는다)
  hostedGroups: Group[];
  events: GroupEvent[];
  members: GroupMember[];
  rsvps: Rsvp[];
  settlements: Settlement[];
  shares: SettlementShare[];
  // 한국 시간 현재 시각 "YYYY-MM-DDTHH:mm"
  now: string;
};

// 시작 시각 오름차순(가까운 회차가 먼저)
function byStartsAt<T extends { startsAt: string }>(a: T, b: T) {
  return a.startsAt.localeCompare(b.startsAt);
}

// 예정 회차 = 상태가 "예정"이고 아직 시작 전인 회차
export function isUpcoming(event: GroupEvent, now: string) {
  return event.status === "scheduled" && event.startsAt > now;
}

// 7일 이내 회차: 예정 회차 중 now < 시작 시각 <= now + 7일
export function isWithinUpcomingWindow(
  event: GroupEvent,
  now: string,
  days = UPCOMING_WINDOW_DAYS,
) {
  return (
    isUpcoming(event, now) && event.startsAt <= addDaysToLocalString(now, days)
  );
}

// 명부 멤버 중 해당 회차에 응답하지 않은 인원.
// 응답의 memberId로 매칭하므로 명부에서 고르지 않고 이름만 직접 입력한 응답은 매칭되지 않는다.
export function countPendingMembers(members: GroupMember[], rsvps: Rsvp[]) {
  const responded = new Set(rsvps.map((item) => item.memberId));
  return members.filter((member) => !responded.has(member.id)).length;
}

// 대시보드 카드 3개 집계
export function buildDashboard({
  hostedGroups,
  events,
  members,
  rsvps,
  settlements,
  shares,
  now,
}: BuildDashboardInput): DashboardSummary {
  const groupNameById = new Map(
    hostedGroups.map((group) => [group.id, group.name]),
  );
  // 내가 주최하는 모임의 회차만 대상으로 한다
  const hostedEvents = events
    .filter((event) => groupNameById.has(event.groupId))
    .sort(byStartsAt);

  const toRef = (event: GroupEvent): DashboardEventRef => ({
    eventId: event.id,
    eventTitle: event.title,
    startsAt: event.startsAt,
    groupName: groupNameById.get(event.groupId) ?? "",
  });
  const rsvpsOf = (eventId: string) =>
    rsvps.filter((item) => item.eventId === eventId);

  // (1) 7일 이내 예정 회차
  const upcomingEvents = hostedEvents
    .filter((event) => isWithinUpcomingWindow(event, now))
    .map((event): UpcomingEventItem => {
      const summary = summarizeRsvps(rsvpsOf(event.id), event.capacity);
      return {
        ...toRef(event),
        attendingCount: summary.attending.length,
        capacity: event.capacity,
      };
    });

  // (2) 응답 미완료 회차: 예정 회차 중 응답 마감 전이고 명부 미응답자가 1명 이상인 회차
  const pendingRsvpEvents = hostedEvents
    .filter(
      (event) =>
        isUpcoming(event, now) && !isDeadlinePassed(event.rsvpDeadline, now),
    )
    .map((event): PendingRsvpItem => {
      const eventRsvps = rsvpsOf(event.id);
      const groupMembers = members.filter(
        (member) => member.groupId === event.groupId,
      );
      return {
        ...toRef(event),
        pendingCount: countPendingMembers(groupMembers, eventRsvps),
        undecidedCount: summarizeRsvps(eventRsvps, event.capacity).undecided
          .length,
      };
    })
    .filter((item) => item.pendingCount > 0);

  // (3) 미입금 정산: 내 회차의 정산 중 입금 완료로 확정되지 않은 항목(미입금·확인 필요)이 남은 정산
  const eventById = new Map(hostedEvents.map((event) => [event.id, event]));
  const unpaidSettlements = settlements
    .flatMap((settlement): UnpaidSettlementItem[] => {
      const event = eventById.get(settlement.eventId);
      if (!event) return [];
      const progress = summarizeShares(
        shares.filter((share) => share.settlementId === settlement.id),
      );
      if (progress.targetCount === 0 || progress.isCompleted) return [];
      return [
        {
          ...toRef(event),
          settlementId: settlement.id,
          unpaidCount: progress.unpaidCount,
          selfReportedCount: progress.selfReportedCount,
          targetCount: progress.targetCount,
        },
      ];
    })
    .sort(byStartsAt);

  return {
    hostedGroupCount: hostedGroups.length,
    upcomingEvents,
    pendingRsvpEvents,
    unpaidSettlements,
  };
}
