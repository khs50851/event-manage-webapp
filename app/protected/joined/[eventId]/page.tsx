import { CalendarClockIcon, ChevronLeftIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EventStatusBadge } from "@/components/groups/event-status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getJoinedEvent } from "@/lib/data/groups";
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import { getEventDisplayStatus, RSVP_STATUS_LABEL } from "@/lib/rsvp";

// 참여한 모임의 내 응답 회차 상세(읽기 전용, Q12). 명부·타인 응답·정산은 보여주지 않는다.
async function JoinedEventLoader({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await getJoinedEvent(eventId);
  if (!detail) notFound();
  const { event, myRsvp } = detail;

  // 상태 배지는 요청 시점 시각으로 판정한다.
  await connection();
  const displayStatus = getEventDisplayStatus(event, nowKstLocalString());

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeftIcon aria-hidden className="size-4" />
          ホーム
        </Link>
        <p className="text-sm text-muted-foreground">{detail.groupName}</p>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold wrap-break-word">{event.title}</h1>
          <EventStatusBadge status={displayStatus} />
        </div>
        <p className="text-sm">{formatDateTime(event.startsAt)}</p>
        <p className="flex items-center gap-1 text-sm">
          <MapPinIcon aria-hidden className="size-4 shrink-0" />
          {event.location}
        </p>
        <p className="text-sm text-muted-foreground">
          定員 {event.capacity === null ? "制限なし" : `${event.capacity}名`}
        </p>
        {event.rsvpDeadline && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarClockIcon aria-hidden className="size-4 shrink-0" />
            回答締切 {formatDateTime(event.rsvpDeadline)}
          </p>
        )}
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </header>

      <section
        aria-labelledby="my-rsvp-heading"
        className="flex flex-col gap-2 rounded-md border p-4"
      >
        <h2 id="my-rsvp-heading" className="font-semibold">
          自分の回答
        </h2>
        <div className="flex items-center gap-2">
          <Badge
            variant={myRsvp.status === "attending" ? "default" : "secondary"}
          >
            {RSVP_STATUS_LABEL[myRsvp.status]}
          </Badge>
          <span className="text-sm">{myRsvp.name}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(myRsvp.respondedAt)}に回答しました
        </p>
        <p className="text-sm text-muted-foreground">
          回答を変更するには、主催者から受け取った招待リンクからもう一度アクセスしてください。
        </p>
      </section>
    </div>
  );
}

function JoinedEventSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function JoinedEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <Suspense fallback={<JoinedEventSkeleton />}>
        <JoinedEventLoader params={params} />
      </Suspense>
    </div>
  );
}
