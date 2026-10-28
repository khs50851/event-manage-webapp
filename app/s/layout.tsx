import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";

// 정산 토큰 링크는 소지자만 열람해야 하므로 검색엔진 색인을 막는다(R1, PRD 7장).
export const metadata: Metadata = {
  title: "精算確認",
  robots: { index: false, follow: false },
};

// 비회원 정산 토큰 페이지용 레이아웃(최소 헤더, 탭바 없음). 초대 페이지(app/i)와 같은 구성.
export default function SettlementTokenLayout({
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
