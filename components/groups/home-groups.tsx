import { FolderPlusIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
  GroupList,
  GroupListSkeleton,
  GroupSectionHeader,
} from "@/components/groups/group-list";
import { Button } from "@/components/ui/button";
import { listGroups, listJoinedGroups } from "@/lib/data/groups";

// 로그인 사용자의 홈(/)에 표시하는 내 모임/참여한 모임 목록(대시보드 U5 전까지 사용)

// "새 모임" 버튼은 로딩 중에도 바로 누를 수 있도록 스켈레톤과 실제 헤더에 모두 넣는다
function NewGroupButton() {
  return (
    <Button asChild className="min-h-11 shrink-0">
      <Link href="/protected/groups/new">
        <PlusIcon aria-hidden className="size-4" />새 모임
      </Link>
    </Button>
  );
}

function HostedHeader({ count }: { count: number | null }) {
  return (
    <GroupSectionHeader
      id="hosted-title"
      as="h1"
      title="내 모임"
      count={count}
      action={<NewGroupButton />}
    />
  );
}

function JoinedHeader({ count }: { count: number | null }) {
  return (
    <GroupSectionHeader id="joined-title" title="참여한 모임" count={count} />
  );
}

async function HostedGroups() {
  const groups = await listGroups();
  return (
    <>
      <HostedHeader count={groups.length} />
      <GroupList
        groups={groups}
        empty={
          <>
            <FolderPlusIcon
              aria-hidden
              className="size-8 text-muted-foreground"
            />
            <div className="flex flex-col gap-1">
              <p className="font-medium">아직 만든 모임이 없어요</p>
              <p className="text-sm text-muted-foreground">
                모임을 만들고 초대 링크로 사람들을 불러보세요.
              </p>
            </div>
            <Button asChild className="min-h-11">
              <Link href="/protected/groups/new">모임 만들기</Link>
            </Button>
          </>
        }
      />
    </>
  );
}

async function JoinedGroups() {
  const groups = await listJoinedGroups();
  return (
    <>
      <JoinedHeader count={groups.length} />
      <GroupList
        groups={groups}
        // 참여자용 모임 화면이 아직 없어 주최자용 상세로 연결하지 않는다
        linkToDetail={false}
        empty={
          <>
            <UsersIcon aria-hidden className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">아직 참여한 모임이 없어요</p>
              <p className="text-sm text-muted-foreground">
                다른 사람이 만든 모임에 참여하면 여기에 표시돼요.
              </p>
            </div>
          </>
        }
      />
    </>
  );
}

export function HomeGroups() {
  return (
    <div className="flex w-full flex-1 flex-col gap-8">
      {/* 두 목록은 서로 독립적이므로 Suspense를 나눠 병렬로 스트리밍한다 */}
      <section className="flex flex-col gap-3" aria-labelledby="hosted-title">
        <Suspense
          fallback={
            <>
              <HostedHeader count={null} />
              <GroupListSkeleton />
            </>
          }
        >
          <HostedGroups />
        </Suspense>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="joined-title">
        <Suspense
          fallback={
            <>
              <JoinedHeader count={null} />
              <GroupListSkeleton count={2} />
            </>
          }
        >
          <JoinedGroups />
        </Suspense>
      </section>
    </div>
  );
}
