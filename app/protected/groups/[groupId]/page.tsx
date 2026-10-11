import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GroupDetail } from "@/components/groups/group-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getGroup, listEvents, listMembers } from "@/lib/data/groups";

async function GroupDetailLoader({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  if (!group) notFound();

  const [events, members] = await Promise.all([
    listEvents(groupId),
    listMembers(groupId),
  ]);

  return (
    <GroupDetail
      initialGroup={group}
      initialEvents={events}
      initialMembers={members}
    />
  );
}

function GroupDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-11 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <Suspense fallback={<GroupDetailSkeleton />}>
        <GroupDetailLoader params={params} />
      </Suspense>
    </div>
  );
}
