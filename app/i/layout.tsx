import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";

// 토큰 링크는 소지자만 열람해야 하므로 검색엔진 색인을 막는다(R1, U3-10).
export const metadata: Metadata = {
  title: "グループ招待",
  robots: { index: false, follow: false },
};

// 비회원 토큰 페이지용 레이아웃(최소 헤더, 탭바 없음)
export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileShell header={<AppHeader minimal right={<ThemeSwitcher />} />}>
      {children}
    </MobileShell>
  );
}
