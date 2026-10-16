import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface GroupListProps {
  groups: Group[];
  // 목록이 비었을 때 보여줄 내용(안내 문구, CTA 등)
  empty: React.ReactNode;
  // 항목의 이동 경로. null이면 이동하지 않는 카드로 표시한다.
  // 기본값은 주최자용 모임 상세(/protected/groups/[id])
  getHref?: (group: Group) => string | null;
}

function hostedGroupHref(group: Group) {
  return `/protected/groups/${group.id}`;
}

interface GroupSectionHeaderProps {
  id: string;
  title: string;
  // 제목 수준(페이지 첫 섹션은 h1, 이후 섹션은 h2)
  as?: "h1" | "h2";
  // 모임 개수. 로딩 중이면 null로 넘겨 자리만 잡는다.
  count: number | null;
  // 우측 액션(버튼 등)
  action?: React.ReactNode;
}

// 섹션 제목 + 개수 + 우측 액션. 로딩/완료 상태에서 같은 높이를 유지한다.
export function GroupSectionHeader({
  id,
  title,
  as: Heading = "h2",
  count,
  action,
}: GroupSectionHeaderProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        {/* 개수도 제목에 포함해 스크린리더가 "내 모임 3개"로 읽게 한다 */}
        <Heading
          id={id}
          className={cn(
            "flex min-w-0 items-baseline gap-1.5 font-bold",
            Heading === "h1" ? "text-2xl" : "text-xl",
          )}
        >
          <span className="truncate">{title}</span>
          {count !== null && (
            <span className="text-base font-medium text-muted-foreground tabular-nums">
              {count}개
            </span>
          )}
        </Heading>
        {/* 스켈레톤은 div라서 제목 밖에 둔다 */}
        {count === null && <Skeleton aria-hidden className="h-5 w-8" />}
      </div>
      {action}
    </div>
  );
}

function GroupItemContent({
  group,
  linked,
}: {
  group: Group;
  linked: boolean;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">{group.name}</p>
        {group.description && (
          <p className="truncate text-sm text-muted-foreground">
            {group.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {group.isOneOff && <Badge variant="secondary">1회성</Badge>}
        {linked ? (
          // 상세로 이동할 수 있는 카드임을 알리는 표시
          <ChevronRightIcon
            aria-hidden
            className="size-5 text-muted-foreground"
          />
        ) : (
          // 이동하지 않는 카드: 역할을 글자로 표시한다(색에만 의존하지 않음)
          <Badge variant="outline" className="text-muted-foreground">
            참여 중
          </Badge>
        )}
      </div>
    </>
  );
}

const ITEM_CLASS =
  "flex min-h-20 items-center justify-between gap-3 rounded-md border p-4";

// 모임 카드 리스트(내 모임 / 참여한 모임 공용)
export function GroupList({
  groups,
  empty,
  getHref = hostedGroupHref,
}: GroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
        {empty}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => {
        const href = getHref(group);
        return (
          <li key={group.id}>
            {href ? (
              <Link
                href={href}
                className={cn(
                  ITEM_CLASS,
                  "bg-background transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-accent",
                )}
              >
                <GroupItemContent group={group} linked />
              </Link>
            ) : (
              // 링크가 없는 카드는 배경을 흐리게 해 누를 수 있는 카드와 구분한다
              <div className={cn(ITEM_CLASS, "bg-muted/40")}>
                <GroupItemContent group={group} linked={false} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function GroupListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: count }, (_, key) => (
        <Skeleton key={key} className="h-20 w-full" />
      ))}
    </div>
  );
}
