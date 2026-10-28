"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 참여한 모임 상세의 예기치 못한 오류(없는 회차는 not-found.tsx가 처리한다).
export default function JoinedEventError({
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
