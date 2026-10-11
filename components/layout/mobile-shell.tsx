import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { BottomTabBar } from "./bottom-tab-bar";

interface MobileShellProps {
  children: React.ReactNode;
  // 상단 헤더(AppHeader)
  header?: React.ReactNode;
  // 하단 플로팅 탭바 표시 여부
  tabBar?: boolean;
}

// 모바일 폭 단일 컬럼 셸: 데스크톱에서도 중앙 480px 컬럼만 보이고 좌우는 배경 여백
export function MobileShell({
  children,
  header,
  tabBar = false,
}: MobileShellProps) {
  return (
    <div className="min-h-svh bg-muted">
      <div className="relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-background shadow-xl md:border-x">
        {header}
        <main
          className={cn(
            "flex flex-1 flex-col px-4 py-5",
            // 플로팅 탭바에 콘텐츠가 가리지 않도록 하단 여백 확보
            tabBar && "pb-[calc(env(safe-area-inset-bottom)+6rem)]",
          )}
        >
          {children}
        </main>
        {tabBar && (
          // usePathname()은 요청 시점 값이므로 Suspense로 감싼다
          <Suspense fallback={null}>
            <BottomTabBar />
          </Suspense>
        )}
      </div>
    </div>
  );
}
