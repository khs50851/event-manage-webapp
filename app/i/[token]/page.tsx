import { MapPinIcon } from "lucide-react";
import { Suspense } from "react";

import { GuestAuthNotice } from "@/components/guest-auth-notice";
import { InviteNotice } from "@/components/rsvp/invite-notice";
import { InviteRsvpPanel } from "@/components/rsvp/invite-rsvp-panel";
import { PublicRsvpList } from "@/components/rsvp/public-rsvp-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getInviteByToken } from "@/lib/data/invites";
import { formatDateTime } from "@/lib/format";
import type { GroupEvent } from "@/lib/types/domain";

// 회차 요약(유효·취소·마감 상태에서만 표시. 무효·만료 토큰에는 렌더링하지 않는다)
function EventSummary({
  event,
  groupName,
}: {
  event: GroupEvent;
  groupName: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      {groupName && (
        <p className="text-sm text-muted-foreground">{groupName}</p>
      )}
      <h1 className="text-2xl font-bold wrap-break-word">{event.title}</h1>
      <p className="text-sm">{formatDateTime(event.startsAt)}</p>
      <p className="flex items-center gap-1 text-sm">
        <MapPinIcon className="size-4 shrink-0" />
        {event.location}
      </p>
      <p className="text-sm text-muted-foreground">
        정원 {event.capacity === null ? "제한 없음" : `${event.capacity}명`}
        {event.rsvpDeadline &&
          ` · 응답 마감 ${formatDateTime(event.rsvpDeadline)}`}
      </p>
      {event.description && (
        <p className="text-sm text-muted-foreground">{event.description}</p>
      )}
    </header>
  );
}

async function InviteLoader({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  switch (invite.status) {
    case "invalid":
      return (
        <InviteNotice kind="invalid" title="유효하지 않은 링크입니다">
          링크 주소가 정확한지 확인하거나 주최자에게 초대 링크를 다시 요청해
          주세요.
        </InviteNotice>
      );
    case "expired":
      return (
        <InviteNotice kind="expired" title="만료된 링크입니다">
          주최자가 초대 링크를 새로 발급했습니다. 주최자에게 새 링크를 요청해
          주세요.
        </InviteNotice>
      );
    case "cancelled":
      return (
        <div className="flex flex-col gap-6">
          <EventSummary event={invite.event} groupName={invite.groupName} />
          <InviteNotice kind="cancelled" title="취소된 회차입니다">
            이 회차는 주최자가 취소해 응답을 받지 않습니다.
          </InviteNotice>
        </div>
      );
    case "closed":
      return (
        <div className="flex flex-col gap-6">
          <EventSummary event={invite.event} groupName={invite.groupName} />
          <InviteNotice
            kind="closed"
            title={
              invite.reason === "ended"
                ? "종료된 회차입니다"
                : "응답이 마감되었습니다"
            }
          >
            {invite.reason === "ended"
              ? "이미 진행된 회차라 응답을 받지 않습니다."
              : "응답 마감 시각이 지나 새 응답이나 수정을 받지 않습니다. 변경이 필요하면 주최자에게 알려 주세요."}
          </InviteNotice>
          <PublicRsvpList
            rsvps={invite.rsvps}
            capacity={invite.event.capacity}
          />
        </div>
      );
    case "open":
      return (
        <div className="flex flex-col gap-8">
          <EventSummary event={invite.event} groupName={invite.groupName} />
          <InviteRsvpPanel
            eventId={invite.event.id}
            capacity={invite.event.capacity}
            members={invite.members}
            initialRsvps={invite.rsvps}
          />
          <GuestAuthNotice className="max-w-none" />
        </div>
      );
  }
}

function InviteSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// 초대 토큰 페이지. 토큰마다 결과가 달라 정적 캐시하지 않고 요청 시점에 스트리밍한다.
export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <InviteLoader params={params} />
    </Suspense>
  );
}
