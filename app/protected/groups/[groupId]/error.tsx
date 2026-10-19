"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 모임 상세의 예기치 못한 오류. 없는 모임은 not-found.tsx가 처리하고 여기까지 오지 않는다.
export default function GroupError({
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
      title="모임 정보를 불러오지 못했어요"
    />
  );
}
