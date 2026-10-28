import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";

// 인증 화면: 최소 헤더, 탭바 없음. 모든 인증 페이지의 카드를 세로 가운데에 둔다.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileShell header={<AppHeader minimal />}>
      <div className="flex w-full flex-1 items-center justify-center py-4">
        <div className="w-full">{children}</div>
      </div>
    </MobileShell>
  );
}
