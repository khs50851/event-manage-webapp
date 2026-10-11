"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, House, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // 현재 경로가 이 탭에 속하는지 판별
  match: (pathname: string) => boolean;
}

// 실제 존재하는 라우트만 탭으로 노출한다
const TABS: TabItem[] = [
  {
    href: "/protected",
    label: "홈",
    icon: House,
    // 내 모임 목록 + 모임/회차 상세는 모두 홈 탭에 속한다
    match: (p) =>
      p === "/protected" ||
      p.startsWith("/protected/events") ||
      (p.startsWith("/protected/groups") && p !== "/protected/groups/new"),
  },
  {
    href: "/protected/groups/new",
    label: "새 모임",
    icon: CirclePlus,
    match: (p) => p === "/protected/groups/new",
  },
  {
    href: "/protected/me",
    label: "내 정보",
    icon: User,
    match: (p) => p.startsWith("/protected/me"),
  },
];

// 하단 플로팅 탭바(활성 탭 판별만 클라이언트에서 처리)
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto w-full max-w-[480px] px-4"
    >
      <ul className="pointer-events-auto flex items-stretch justify-around rounded-full border bg-background/95 p-1.5 shadow-lg backdrop-blur">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
