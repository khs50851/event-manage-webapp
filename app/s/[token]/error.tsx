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
      title="精算情報を読み込めませんでした"
      hint="問題が続く場合は主催者に連絡してください。"
    />
  );
}
