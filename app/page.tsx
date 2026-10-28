import { Suspense } from "react";

import { EnvVarWarning } from "@/components/env-var-warning";
import { HomeGroups } from "@/components/groups/home-groups";
import { GuestAuthNotice } from "@/components/guest-auth-notice";
import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getIsLoggedIn } from "@/lib/data/source";
import { hasEnvVars } from "@/lib/utils";

// 헤더는 로그인 여부와 무관하므로 폴백 셸과 실제 셸에서 같이 쓴다
function HomeHeader() {
  return (
    <AppHeader
      right={
        <>
          <ThemeSwitcher />
          {!hasEnvVars && <EnvVarWarning />}
        </>
      }
    />
  );
}

// 비로그인 홈: 서비스 소개 히어로 + 로그인/회원가입 안내
function GuestHome() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-2xl bg-muted p-6">
        <h1 className="text-2xl leading-tight font-bold">
          グループの日程と出欠を
          <br />
          1か所で
        </h1>
        <p className="text-sm text-muted-foreground">
          招待リンク1つで出欠を集め、開催回ごとの日程を簡単に管理しましょう。
        </p>
      </section>
      {hasEnvVars && <GuestAuthNotice className="max-w-none" />}
    </div>
  );
}

// 세션 확인 전 정적 셸에 포함되는 본문 자리 표시(로그인/비로그인 어느 쪽으로도 치우치지 않게 중립적으로 둔다)
function HomeBodySkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-6"
      aria-busy="true"
      aria-label="読み込み中"
    >
      <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

// 로그인 여부(세션 쿠키 = 요청별 데이터)에 따라 셸 전체를 구성한다.
// 탭바 표시 여부와 하단 여백이 MobileShell 단위로 결정되므로 셸까지 이 컴포넌트 안에서 만든다.
async function HomeShell() {
  // 환경 변수가 없으면 Supabase 클라이언트를 만들 수 없으므로 세션 확인을 건너뛴다
  const isLoggedIn = hasEnvVars ? await getIsLoggedIn() : false;

  return (
    // 비로그인 시 탭바는 보호 경로 링크뿐이므로 숨긴다
    <MobileShell header={<HomeHeader />} tabBar={isLoggedIn}>
      {isLoggedIn ? <HomeGroups /> : <GuestHome />}
    </MobileShell>
  );
}

export default function Home() {
  return (
    // 폴백(헤더 + 중립 스켈레톤)이 정적 셸로 프리렌더되고, 세션 확인 후 실제 셸로 교체된다
    <Suspense
      fallback={
        <MobileShell header={<HomeHeader />}>
          <HomeBodySkeleton />
        </MobileShell>
      }
    >
      <HomeShell />
    </Suspense>
  );
}
