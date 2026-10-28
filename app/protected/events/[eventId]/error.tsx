"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 회차 상세의 예기치 못한 오류. 없는 회차는 not-found.tsx, 정산 화면 오류는 settlement/error.tsx가 처리한다.
export default function EventError({
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
      title="開催回の情報を読み込めませんでした"
    />
  );
}
