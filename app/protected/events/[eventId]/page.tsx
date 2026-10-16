import { ChevronLeftIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { HostRsvpStatus } from "@/components/rsvp/host-rsvp-status";
import { InviteLinkCard } from "@/components/rsvp/invite-link-card";
import { RsvpDeadlineCard } from "@/components/rsvp/rsvp-deadline-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getEvent, getGroup, listMembers } from "@/lib/data/groups";
import { getActiveInviteToken, listRsvps } from "@/lib/data/invites";
import { getHostSettlement } from "@/lib/data/settlements";
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import { isDeadlinePassed } from "@/lib/rsvp";
import { SETTLEMENT_STATUS_LABEL, summarizeShares } from "@/lib/settlement";
import type { EventStatus } from "@/lib/types/domain";

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "예정",
  cancelled: "취소됨",
  ended: "종료",
};

async function EventDetailLoader({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  // 회차 확인 후 나머지 조회는 서로 독립적이므로 병렬로 가져온다.
  const [group, members, rsvps, inviteToken, settlementData] =
    await Promise.all([
      getGroup(event.groupId),
      listMembers(event.groupId),
      listRsvps(event.id),
      getActiveInviteToken(event.id),
      getHostSettlement(event.id),
    ]);
  const settlementProgress = settlementData.settlement
    ? {
        statusLabel: SETTLEMENT_STATUS_LABEL[settlementData.settlement.status],
        ...summarizeShares(settlementData.shares),
      }
    : null;

  // 마감 여부는 요청 시점 시각으로 판정한다.
  await connection();
  const initialClosed = isDeadlinePassed(
    event.rsvpDeadline,
    nowKstLocalString(),
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href={`/protected/groups/${event.groupId}`}
          className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeftIcon className="size-4" />
          {group?.name ?? "모임"}
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold wrap-break-word">{event.title}</h1>
          <Badge
            variant={event.status === "scheduled" ? "default" : "secondary"}
          >
            {STATUS_LABEL[event.status]}
          </Badge>
        </div>
        <p className="text-sm">{formatDateTime(event.startsAt)}</p>
        <p className="flex items-center gap-1 text-sm">
          <MapPinIcon className="size-4 shrink-0" />
          {event.location}
        </p>
        {/* 응답 마감은 아래 "응답 마감" 영역에서 표시·변경한다 */}
        <p className="text-sm text-muted-foreground">
          정원 {event.capacity === null ? "제한 없음" : `${event.capacity}명`}
        </p>
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </header>

      <InviteLinkCard
        eventId={event.id}
        eventTitle={event.title}
        eventStatus={event.status}
        initialToken={inviteToken}
      />
      <RsvpDeadlineCard
        eventId={event.id}
        startsAt={event.startsAt}
        eventStatus={event.status}
        initialDeadline={event.rsvpDeadline}
        initialClosed={initialClosed}
      />
      <HostRsvpStatus
        eventId={event.id}
        capacity={event.capacity}
        members={members}
        initialRsvps={rsvps}
      />

      {/* 정산 요약과 정산 관리 진입점(U4). 상세 편집은 /settlement 화면에서 한다. */}
      <section
        aria-labelledby="settlement-heading"
        className="flex flex-col items-start gap-2 rounded-md border p-4"
      >
        <h2 id="settlement-heading" className="font-semibold">
          정산
        </h2>
        <p className="text-sm text-muted-foreground">
          {settlementProgress
            ? `${settlementProgress.statusLabel} · 입금 완료 ${settlementProgress.paidCount}/${settlementProgress.targetCount}명`
            : "아직 정산이 없어요."}
        </p>
        <Link
          href={`/protected/events/${event.id}/settlement`}
          className="flex min-h-11 items-center text-sm font-medium underline"
        >
          {settlementProgress ? "정산 관리" : "정산 만들기"}
        </Link>
      </section>
    </div>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailLoader params={params} />
      </Suspense>
    </div>
  );
}
