import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";

// 인증 화면: 최소 헤더, 탭바 없음
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MobileShell header={<AppHeader minimal />}>{children}</MobileShell>;
}
