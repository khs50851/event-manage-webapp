import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  DashboardCards,
  DashboardCardsSkeleton,
  EmptyDashboard,
} from "@/components/dashboard/dashboard-cards";
import {
  HostedGroupsSkeleton,
  HostedGroupsView,
  JoinedGroupsSkeleton,
  JoinedGroupsView,
} from "@/components/groups/home-groups";
import { getDashboard } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

type DashboardSearchParams = Promise<{ preview?: string | string[] }>;

// 세션 쿠키 확인. 대시보드 조회와 병렬로 실행하려고 별도 함수로 분리한다.
async function getClaims() {
  if (!hasEnvVars) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

// 세션 쿠키·요청 시점 시각을 읽으므로 Suspense 안에서 렌더링한다
async function DashboardLoader({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const [claims, data] = await Promise.all([
    getClaims(),
    // ?preview=empty: 개발 환경 전용 빈 대시보드 미리보기(프로덕션에서는 getDashboard가 무시)
    searchParams.then(({ preview }) =>
      getDashboard({
        preview: typeof preview === "string" ? preview : undefined,
      }),
    ),
  ]);

  // proxy의 목업 미리보기(개발 환경에서 /protected/* 비로그인 열람)와 정책을 맞춘다.
  // 연동 단계(I2)에서 목업 미리보기를 제거할 때 조건 없이 리다이렉트하도록 되돌린다.
  if (!claims && process.env.NODE_ENV === "production") {
    redirect("/auth/login");
  }

  const isEmpty = data.hostedGroupCount === 0;

  return (
    <div className="flex flex-col gap-8">
      {isEmpty ? <EmptyDashboard /> : <DashboardCards summary={data} />}

      {/* 기존 "내 모임 목록" 기능 유지. 빈 상태에서는 위 CTA와 겹치므로 내 모임 목록을 생략한다. */}
      {!isEmpty && (
        <section className="flex flex-col gap-3" aria-labelledby="hosted-title">
          <HostedGroupsView groups={data.hostedGroups} headingAs="h2" />
        </section>
      )}
      <section className="flex flex-col gap-3" aria-labelledby="joined-title">
        <JoinedGroupsView groups={data.joinedGroups} />
      </section>
    </div>
  );
}

// 실제 레이아웃(카드 3개 / 내 모임 / 참여한 모임)과 같은 순서의 스켈레톤
function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-8"
      aria-busy="true"
      aria-label="대시보드를 불러오는 중"
    >
      <DashboardCardsSkeleton />
      <div className="flex flex-col gap-3">
        <HostedGroupsSkeleton headingAs="h2" />
      </div>
      <div className="flex flex-col gap-3">
        <JoinedGroupsSkeleton />
      </div>
    </div>
  );
}

// 주최자 대시보드(FR-11). 제목은 정적 셸로 먼저 보이고, 카드·목록은 요청 시점에 스트리밍한다.
export default function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
