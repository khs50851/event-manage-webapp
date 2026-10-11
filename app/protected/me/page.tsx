import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LogoutButton } from "@/components/logout-button";
import { ProfileCard } from "@/components/me/profile-card";
import { StatsCards } from "@/components/me/stats-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyProfile, getMyStats } from "@/lib/data/me";
import { createClient } from "@/lib/supabase/server";

// 세션 쿠키 확인. 다른 조회와 병렬로 실행하려고 별도 함수로 분리한다.
async function getClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

// 세션 쿠키를 읽으므로 Suspense 안에서 렌더링한다
async function MyInfo() {
  const [claims, profile, stats] = await Promise.all([
    getClaims(),
    getMyProfile(),
    getMyStats(),
  ]);

  // proxy의 목업 미리보기(개발 환경에서 /protected/* 비로그인 열람)와 정책을 맞춘다.
  // 개발 환경에서까지 리다이렉트하면 이 탭만 /auth/login으로 튕겨 탭바가 사라진다.
  // 연동 단계(I2)에서 목업 미리보기를 제거할 때 조건 없이 리다이렉트하도록 되돌린다.
  if (!claims && process.env.NODE_ENV === "production") {
    redirect("/auth/login");
  }

  // 로그인 상태면 이메일은 실제 세션 값을 우선한다
  const email = claims?.email ?? profile.email;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ProfileCard
        name={profile.name}
        email={email}
        joinedAt={profile.joinedAt}
      />
      <StatsCards
        hostedCount={stats.hostedCount}
        joinedCount={stats.joinedCount}
      />
      {/* 계정 동작은 콘텐츠 맨 아래(탭바 바로 위)에 둬 엄지로 누르기 쉽게 한다 */}
      <div className="mt-auto pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}

// 실제 레이아웃(프로필 카드 / 모임 현황 / 로그아웃)과 같은 높이로 맞춘 스켈레톤
function MyInfoSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-6"
      aria-busy="true"
      aria-label="내 정보를 불러오는 중"
    >
      <div className="flex items-center gap-4 rounded-md border p-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-20" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[98px] w-full" />
          <Skeleton className="h-[98px] w-full" />
        </div>
      </div>
      <div className="mt-auto pt-2">
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export default function MePage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold">내 정보</h1>
      <Suspense fallback={<MyInfoSkeleton />}>
        <MyInfo />
      </Suspense>
    </div>
  );
}
