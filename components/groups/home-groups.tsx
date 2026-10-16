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
import type { Group, JoinedGroup } from "@/lib/types/domain";

// 로그인 사용자의 홈(/)에 표시하는 내 모임/참여한 모임 목록.
// 표시 전용 View·스켈레톤은 대시보드(/protected) 하단 목록에서도 재사용한다.

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

// 제목 수준: 홈에서는 페이지 첫 제목(h1), 대시보드처럼 상위 제목이 있으면 h2
type HeadingLevel = "h1" | "h2";

function HostedHeader({
  count,
  as = "h1",
}: {
  count: number | null;
  as?: HeadingLevel;
}) {
  return (
    <GroupSectionHeader
      id="hosted-title"
      as={as}
      title="내 모임"
      count={count}
      // 모임이 없을 땐 빈 상태의 "모임 만들기"와 중복이므로 숨긴다
      action={count === 0 ? undefined : <NewGroupButton />}
    />
  );
}

function JoinedHeader({ count }: { count: number | null }) {
  return (
    <GroupSectionHeader id="joined-title" title="참여한 모임" count={count} />
  );
}

// 내 모임 목록(표시 전용). 조회는 호출하는 쪽에서 한다(홈: listGroups, 대시보드: getDashboard).
// 감싸는 <section aria-labelledby="hosted-title">은 호출하는 쪽이 둔다(스켈레톤과 같은 섹션 안에서 교체되도록).
export function HostedGroupsView({
  groups,
  headingAs = "h1",
}: {
  groups: Group[];
  headingAs?: HeadingLevel;
}) {
  return (
    <>
      <HostedHeader count={groups.length} as={headingAs} />
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

// 참여한 모임 목록(표시 전용). 감싸는 <section aria-labelledby="joined-title">은 호출하는 쪽이 둔다.
export function JoinedGroupsView({ groups }: { groups: JoinedGroup[] }) {
  // 모임 단위 참여자 화면은 없으므로, 내가 응답한 다가오는 회차가 있을 때만 그 회차 상세로 연결한다
  const nextEventById = new Map(
    groups.map((group) => [group.id, group.nextEvent]),
  );
  return (
    <>
      <JoinedHeader count={groups.length} />
      <GroupList
        groups={groups}
        getHref={(group) => {
          const nextEvent = nextEventById.get(group.id);
          return nextEvent ? `/protected/joined/${nextEvent.id}` : null;
        }}
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

async function HostedGroups() {
  const groups = await listGroups();
  return <HostedGroupsView groups={groups} />;
}

async function JoinedGroups() {
  const groups = await listJoinedGroups();
  return <JoinedGroupsView groups={groups} />;
}

// 목록 스켈레톤(홈·대시보드 공용). 제목 수준은 실제 목록과 맞춘다.
export function HostedGroupsSkeleton({
  headingAs = "h1",
}: {
  headingAs?: HeadingLevel;
}) {
  return (
    <>
      <HostedHeader count={null} as={headingAs} />
      <GroupListSkeleton />
    </>
  );
}

export function JoinedGroupsSkeleton() {
  return (
    <>
      <JoinedHeader count={null} />
      <GroupListSkeleton count={2} />
    </>
  );
}

export function HomeGroups() {
  return (
    <div className="flex w-full flex-1 flex-col gap-8">
      {/* 두 목록은 서로 독립적이므로 Suspense를 나눠 병렬로 스트리밍한다 */}
      <section className="flex flex-col gap-3" aria-labelledby="hosted-title">
        <Suspense fallback={<HostedGroupsSkeleton />}>
          <HostedGroups />
        </Suspense>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="joined-title">
        <Suspense fallback={<JoinedGroupsSkeleton />}>
          <JoinedGroups />
        </Suspense>
      </section>
    </div>
  );
}
