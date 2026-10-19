"use client";

import { RouteErrorFallback } from "@/components/layout/route-error-fallback";

// 초대 페이지의 예기치 못한 오류. 무효·만료·취소·마감은 페이지 안에서 별도 안내하고 여기까지 오지 않는다.
export default function InviteError({
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
      title="초대 정보를 불러오지 못했어요"
      hint="문제가 계속되면 주최자에게 알려 주세요."
    />
  );
}
