import {
  CalendarClockIcon,
  ChevronRightIcon,
  FolderPlusIcon,
  MailQuestionIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UPCOMING_WINDOW_DAYS,
  type DashboardSummary,
  type PendingRsvpItem,
  type UnpaidSettlementItem,
  type UpcomingEventItem,
} from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// 대시보드 카드(표시 전용 서버 컴포넌트). 집계는 lib/dashboard.ts, 조회는 lib/data/dashboard.ts가 맡는다.

type CardItem = {
  key: string;
  href: string;
  title: string;
  // "모임명 · 일시"
  meta: string;
  // 카드별 보조 정보(인원 등)
  detail: string;
};

interface DashboardCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count: number;
  items: CardItem[];
  // 0건일 때 안내 문구
  emptyText: string;
}

function DashboardCard({
  id,
  title,
  description,
  icon: Icon,
  count,
  items,
  emptyText,
}: DashboardCardProps) {
  return (
    <Card aria-labelledby={id} className="gap-4 py-4" role="region">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center justify-between gap-2">
          <h2 id={id} className="flex items-center gap-1.5 text-base">
            <Icon aria-hidden className="size-4 shrink-0" />
            {title}
          </h2>
          <p className="flex items-baseline gap-0.5">
            {/* 0이면 숫자를 흐리게 보여 '할 일 없음'을 드러낸다 */}
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                count === 0 && "text-muted-foreground",
              )}
            >
              {count}
            </span>
            <span className="text-sm text-muted-foreground">건</span>
          </p>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-accent"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.meta}
                    </p>
                    <p className="text-xs">{item.detail}</p>
                  </div>
                  <ChevronRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function metaOf(item: { groupName: string; startsAt: string }) {
  const when = formatDateTime(item.startsAt);
  return item.groupName ? `${item.groupName} · ${when}` : when;
}

function upcomingItem(item: UpcomingEventItem): CardItem {
  return {
    key: item.eventId,
    href: `/protected/events/${item.eventId}`,
    title: item.eventTitle,
    meta: metaOf(item),
    detail:
      item.capacity === null
        ? `참석 ${item.attendingCount}명`
        : `참석 ${item.attendingCount}/${item.capacity}명`,
  };
}

function pendingItem(item: PendingRsvpItem): CardItem {
  return {
    key: item.eventId,
    href: `/protected/events/${item.eventId}`,
    title: item.eventTitle,
    meta: metaOf(item),
    detail:
      item.undecidedCount > 0
        ? `미응답 ${item.pendingCount}명 · 미정 ${item.undecidedCount}명`
        : `미응답 ${item.pendingCount}명`,
  };
}

function unpaidItem(item: UnpaidSettlementItem): CardItem {
  // 0명인 상태는 생략한다(정산이 목록에 있으면 둘 중 하나는 항상 1명 이상)
  const parts: string[] = [];
  if (item.unpaidCount > 0) parts.push(`미입금 ${item.unpaidCount}명`);
  if (item.selfReportedCount > 0) {
    parts.push(`확인 필요 ${item.selfReportedCount}명`);
  }
  return {
    key: item.settlementId,
    href: `/protected/events/${item.eventId}/settlement`,
    title: item.eventTitle,
    meta: metaOf(item),
    detail: `${parts.join(" · ")} (대상 ${item.targetCount}명)`,
  };
}

// 카드 3개: 7일 이내 회차 / 응답 미완료 회차 / 미입금 정산
export function DashboardCards({
  summary,
}: {
  summary: Pick<
    DashboardSummary,
    "upcomingEvents" | "pendingRsvpEvents" | "unpaidSettlements"
  >;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DashboardCard
        id="dashboard-upcoming"
        title={`${UPCOMING_WINDOW_DAYS}일 이내 회차`}
        description="곧 시작하는 예정 회차예요."
        icon={CalendarClockIcon}
        count={summary.upcomingEvents.length}
        items={summary.upcomingEvents.map(upcomingItem)}
        emptyText={`${UPCOMING_WINDOW_DAYS}일 안에 예정된 회차가 없어요.`}
      />
      <DashboardCard
        id="dashboard-pending-rsvp"
        title="응답 미완료 회차"
        description="명부 멤버 중 아직 응답하지 않은 사람이 있는 회차예요."
        icon={MailQuestionIcon}
        count={summary.pendingRsvpEvents.length}
        items={summary.pendingRsvpEvents.map(pendingItem)}
        emptyText="응답을 기다리는 회차가 없어요."
      />
      <DashboardCard
        id="dashboard-unpaid"
        title="미입금 정산"
        description="입금 확인이 끝나지 않은 정산이에요."
        icon={WalletIcon}
        count={summary.unpaidSettlements.length}
        items={summary.unpaidSettlements.map(unpaidItem)}
        emptyText="입금을 기다리는 정산이 없어요."
      />
    </div>
  );
}

// 빈 대시보드(내가 만든 모임 0건): 첫 모임 만들기 CTA(PRD 7장)
export function EmptyDashboard() {
  return (
    <section
      aria-labelledby="dashboard-empty-title"
      className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center"
    >
      <FolderPlusIcon aria-hidden className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 id="dashboard-empty-title" className="font-semibold">
          첫 모임을 만들어보세요
        </h2>
        <p className="text-sm text-muted-foreground">
          모임을 만들면 다가오는 회차, 응답 현황, 정산을 여기서 한눈에 볼 수
          있어요.
        </p>
      </div>
      <Button asChild className="min-h-11">
        <Link href="/protected/groups/new">모임 만들기</Link>
      </Button>
    </section>
  );
}

// 카드 3개 자리 스켈레톤(PRD 7장: 카드 스켈레톤)
export function DashboardCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: 3 }, (_, key) => (
        <div key={key} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-10" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
