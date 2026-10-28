"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 정산 관리 화면의 예기치 못한 오류. 계산 오류처럼 예상 가능한 오류는 화면 안에서 인라인으로 처리하고 여기까지 오지 않는다.
export default function SettlementError({
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
      title="精算情報を読み込めませんでした"
    />
  );
}
