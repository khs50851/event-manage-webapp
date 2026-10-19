"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 정산 조회 중 예기치 못한 오류.
export default function SettlementTokenError({
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
      title="정산 정보를 불러오지 못했어요"
      hint="문제가 계속되면 주최자에게 알려 주세요."
    />
  );
}
