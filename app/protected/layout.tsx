import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileShell header={<AppHeader right={<ThemeSwitcher />} />} tabBar>
      {children}
    </MobileShell>
  );
}
