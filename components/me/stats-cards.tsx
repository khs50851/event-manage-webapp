import { CalendarPlusIcon, UsersIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatsCardsProps {
  // 내가 만든 모임 수
  hostedCount: number;
  // 내가 참여한 모임 수
  joinedCount: number;
}

// 내 정보: 모임 통계 카드 2개(표시 전용 서버 컴포넌트)
export function StatsCards({ hostedCount, joinedCount }: StatsCardsProps) {
  const items = [
    { label: "作成したグループ", value: hostedCount, Icon: CalendarPlusIcon },
    { label: "参加中のグループ", value: joinedCount, Icon: UsersIcon },
  ];

  return (
    <section aria-labelledby="stats-title" className="flex flex-col gap-3">
      <h2 id="stats-title" className="text-base font-semibold">
        グループの状況
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-md border p-4"
          >
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </dt>
            <dd className="flex items-baseline gap-1">
              {/* 0이면 숫자를 흐리게 보여 '아직 없음'을 자연스럽게 드러낸다 */}
              <span
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  value === 0 && "text-muted-foreground",
                )}
              >
                {value}
              </span>
              <span className="text-sm text-muted-foreground">件</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
