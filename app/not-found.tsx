import Link from "next/link";

import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";

// 존재하지 않는 주소 공통 안내(기본 영어 404 화면 대신 표시)
export default function NotFound() {
  return (
    <MobileShell header={<AppHeader minimal right={<ThemeSwitcher />} />}>
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-xl font-bold">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          アドレスが間違っているか、削除されたページです。
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          ホームに戻る
        </Link>
      </div>
    </MobileShell>
  );
}
