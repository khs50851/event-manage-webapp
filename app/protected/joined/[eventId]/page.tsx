import { CalendarClockIcon, ChevronLeftIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getJoinedEvent } from "@/lib/data/groups";
import { formatDateTime } from "@/lib/format";
import { RSVP_STATUS_LABEL } from "@/lib/rsvp";
import type { EventStatus } from "@/lib/types/domain";

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "예정",
  cancelled: "취소됨",
  ended: "종료",
};

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

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeftIcon aria-hidden className="size-4" />홈
        </Link>
        <p className="text-sm text-muted-foreground">{detail.groupName}</p>
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
          <MapPinIcon aria-hidden className="size-4 shrink-0" />
          {event.location}
        </p>
        <p className="text-sm text-muted-foreground">
          정원 {event.capacity === null ? "제한 없음" : `${event.capacity}명`}
        </p>
        {event.rsvpDeadline && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarClockIcon aria-hidden className="size-4 shrink-0" />
            응답 마감 {formatDateTime(event.rsvpDeadline)}
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
          내 응답
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
          {formatDateTime(myRsvp.respondedAt)}에 응답했어요
        </p>
        <p className="text-sm text-muted-foreground">
          응답을 바꾸려면 주최자에게 받은 초대 링크로 다시 들어가 주세요.
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
