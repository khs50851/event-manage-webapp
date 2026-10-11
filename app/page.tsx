import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { GuestAuthNotice } from "@/components/guest-auth-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

// 로그인 여부에 따라 시작 액션을 바꾼다(세션 쿠키를 읽으므로 Suspense 필요)
async function HomeAction() {
  if (!hasEnvVars) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    return (
      <Button asChild size="lg" className="min-h-12 w-full">
        <Link href="/protected">내 모임 보러가기</Link>
      </Button>
    );
  }
  return <GuestAuthNotice className="max-w-none" />;
}

export default function Home() {
  return (
    <MobileShell
      header={
        <AppHeader
          right={
            <>
              <ThemeSwitcher />
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
            </>
          }
        />
      }
    >
      <div className="flex flex-1 flex-col gap-6">
        <section className="flex flex-col gap-2 rounded-2xl bg-muted p-6">
          <h1 className="text-2xl font-bold leading-tight">
            모임 일정과 참석 응답을
            <br />한 곳에서
          </h1>
          <p className="text-sm text-muted-foreground">
            초대 링크 하나로 참석 여부를 모으고, 회차별 일정을 간편하게
            관리하세요.
          </p>
        </section>
        <Suspense>
          <HomeAction />
        </Suspense>
      </div>
    </MobileShell>
  );
}
