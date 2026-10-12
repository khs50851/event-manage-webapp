"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 대시보드의 예기치 못한 오류(오류 경계는 클라이언트 컴포넌트여야 한다).
// (dashboard) 라우트 그룹에 두어 /protected 하위의 다른 화면에는 적용되지 않게 한다.
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border p-4"
    >
      <p className="font-semibold">대시보드를 불러오지 못했어요</p>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button type="button" className="min-h-11" onClick={() => retry()}>
        다시 시도
      </Button>
    </div>
  );
}
