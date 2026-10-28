import { MapPinIcon } from "lucide-react";
import { Suspense } from "react";

import { GuestAuthNotice } from "@/components/guest-auth-notice";
import { InviteNotice } from "@/components/rsvp/invite-notice";
import { InviteRsvpPanel } from "@/components/rsvp/invite-rsvp-panel";
import { PublicRsvpList } from "@/components/rsvp/public-rsvp-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getInviteByToken } from "@/lib/data/invites";
import { getIsLoggedIn } from "@/lib/data/source";
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
        定員 {event.capacity === null ? "制限なし" : `${event.capacity}名`}
        {event.rsvpDeadline &&
          `  · 回答締切 ${formatDateTime(event.rsvpDeadline)}`}
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
        <InviteNotice kind="invalid" titleAs="h1" title="無効なリンクです">
          リンクのアドレスが正しいか確認するか、主催者に招待リンクをもう一度依頼してください。
        </InviteNotice>
      );
    case "expired":
      return (
        <InviteNotice
          kind="expired"
          titleAs="h1"
          title="有効期限切れのリンクです"
        >
          主催者が招待リンクを再発行しました。主催者に新しいリンクを依頼してください。
        </InviteNotice>
      );
    case "cancelled":
      return (
        <div className="flex flex-col gap-6">
          <EventSummary event={invite.event} groupName={invite.groupName} />
          <InviteNotice kind="cancelled" title="中止された開催回です">
            この開催回は主催者により中止されたため、回答を受け付けていません。
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
                ? "終了した開催回です"
                : "回答は締め切られました"
            }
          >
            {invite.reason === "ended"
              ? "すでに開催された回のため、回答を受け付けていません。"
              : "回答締切時刻を過ぎたため、新規回答や変更を受け付けていません。変更が必要な場合は主催者に連絡してください。"}
          </InviteNotice>
          <PublicRsvpList
            rsvps={invite.rsvps}
            capacity={invite.event.capacity}
            myRsvpId={invite.myRsvp?.id ?? null}
          />
        </div>
      );
    case "open": {
      // 로그인한 사용자에게는 로그인 유도 카드를 보여주지 않는다
      const isLoggedIn = await getIsLoggedIn();
      return (
        <div className="flex flex-col gap-8">
          <EventSummary event={invite.event} groupName={invite.groupName} />
          <InviteRsvpPanel
            token={token}
            eventId={invite.event.id}
            capacity={invite.event.capacity}
            members={invite.members}
            initialRsvps={invite.rsvps}
            initialMyRsvp={invite.myRsvp}
          />
          {!isLoggedIn && <GuestAuthNotice className="max-w-none" />}
        </div>
      );
    }
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
