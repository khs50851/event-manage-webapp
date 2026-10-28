"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 라우트 오류 경계(error.tsx)의 공통 화면. 오류 경계는 클라이언트 컴포넌트여야 한다.
// Next.js 16.3부터 retry()가 안정 API다(세그먼트를 다시 가져와 렌더링). reset()은 다시 가져오지 않으므로 쓰지 않는다.
export function RouteErrorFallback({
  error,
  retry,
  title,
  hint,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title: string;
  // 기본 안내 뒤에 덧붙일 문장(예: 비회원 화면의 "주최자에게 알려 주세요")
  hint?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border p-4"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">
        しばらくしてからもう一度お試しください。{hint && ` ${hint}`}
      </p>
      <Button type="button" className="min-h-11" onClick={() => retry()}>
        再試行
      </Button>
    </div>
  );
}
