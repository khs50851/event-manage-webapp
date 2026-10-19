"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 대시보드의 예기치 못한 오류. (dashboard) 라우트 그룹에 두어 /protected 하위의 다른 화면에는 적용되지 않게 한다.
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      retry={retry}
      title="대시보드를 불러오지 못했어요"
    />
  );
}
