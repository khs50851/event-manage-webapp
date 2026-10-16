import { Suspense } from "react";

import { GuestAuthNotice } from "@/components/guest-auth-notice";
import { InviteNotice } from "@/components/rsvp/invite-notice";
import { PublicSettlementView } from "@/components/settlement/public-settlement-view";
import { PublicSettlementSkeleton } from "@/components/settlement/settlement-skeletons";
import { getSettlementByToken } from "@/lib/data/settlements";
import { getIsLoggedIn } from "@/lib/data/source";
import { formatDateTime } from "@/lib/format";

async function SettlementLoader({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await getSettlementByToken(token);

  switch (lookup.status) {
    case "invalid":
      return (
        <InviteNotice
          kind="invalid"
          titleAs="h1"
          title="유효하지 않은 링크예요"
        >
          링크 주소가 정확한지 확인하거나 주최자에게 정산 링크를 다시 요청해
          주세요.
        </InviteNotice>
      );
    case "expired":
      return (
        <InviteNotice kind="expired" titleAs="h1" title="만료된 링크예요">
          주최자가 정산 링크를 새로 발급했어요. 주최자에게 새 링크를 요청해
          주세요.
        </InviteNotice>
      );
    case "active": {
      // 로그인한 사용자에게는 로그인 유도 카드를 보여주지 않는다
      const isLoggedIn = await getIsLoggedIn();
      return (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            {lookup.groupName && (
              <p className="text-sm text-muted-foreground">
                {lookup.groupName}
              </p>
            )}
            <h1 className="text-2xl font-bold wrap-break-word">
              {lookup.event.title} 정산
            </h1>
            <p className="text-sm">{formatDateTime(lookup.event.startsAt)}</p>
          </header>
          <PublicSettlementView
            token={token}
            settlement={lookup.settlement}
            shares={lookup.shares}
            progress={lookup.progress}
          />
          {!isLoggedIn && (
            <GuestAuthNotice variant="settlement" className="max-w-none" />
          )}
        </div>
      );
    }
  }
}

// 정산 토큰 페이지(FR-10). 토큰마다 결과가 달라 정적 캐시하지 않고 요청 시점에 스트리밍한다.
export default function SettlementTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<PublicSettlementSkeleton />}>
      <SettlementLoader params={params} />
    </Suspense>
  );
}
