import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppHeaderProps {
  // 우측 아이콘 액션 영역(테마 전환, 인증 버튼 등)
  right?: React.ReactNode;
  // 인증/초대 화면용 최소 헤더(로고만 작게 표시)
  minimal?: boolean;
}

// 상단 앱 헤더: 좌측 로고/앱 이름, 우측 액션
export function AppHeader({ right, minimal = false }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur",
        minimal ? "h-12" : "h-14",
      )}
    >
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2 font-bold tracking-tight"
      >
        <CalendarCheck className="size-5" aria-hidden />
        <span className={cn(minimal ? "text-base" : "text-lg")}>모여봐</span>
      </Link>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </header>
  );
}
