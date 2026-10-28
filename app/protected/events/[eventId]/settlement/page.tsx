import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SettlementManager } from "@/components/settlement/settlement-manager";
import { HostSettlementSkeleton } from "@/components/settlement/settlement-skeletons";
import { getEvent, getGroup, listMembers } from "@/lib/data/groups";
import { listRsvps } from "@/lib/data/invites";
import { getHostSettlement } from "@/lib/data/settlements";
import { formatDateTime } from "@/lib/format";
import { buildSettlementCandidates } from "@/lib/settlement";

async function SettlementLoader({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  // 회차 확인 후 나머지 조회는 서로 독립적이므로 병렬로 가져온다.
  const [group, members, rsvps, settlementData] = await Promise.all([
    getGroup(event.groupId),
    listMembers(event.groupId),
    listRsvps(event.id),
    getHostSettlement(event.id),
  ]);
  const candidates = buildSettlementCandidates(
    rsvps,
    members,
    settlementData.shares,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href={`/protected/events/${event.id}`}
          className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeftIcon className="size-4" />
          {event.title}
        </Link>
        <h1 className="text-2xl font-bold">精算管理</h1>
        <p className="text-sm text-muted-foreground">
          {group?.name ? `${group.name} · ` : ""}
          {formatDateTime(event.startsAt)}
        </p>
      </header>
      <SettlementManager
        event={{
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          status: event.status,
          groupName: group?.name ?? "",
        }}
        candidates={candidates}
        initial={settlementData}
      />
    </div>
  );
}

// 주최자 정산 관리(FR-08, FR-09). 정산·입금 상태는 요청마다 달라 Suspense 안에서 스트리밍한다.
export default function EventSettlementPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <Suspense fallback={<HostSettlementSkeleton />}>
        <SettlementLoader params={params} />
      </Suspense>
    </div>
  );
}
