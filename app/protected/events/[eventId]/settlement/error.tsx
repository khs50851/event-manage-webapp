"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 정산 관리 화면의 예기치 못한 오류(오류 경계는 클라이언트 컴포넌트여야 한다).
// 계산 오류처럼 예상 가능한 오류는 화면 안에서 인라인으로 처리하고 여기까지 오지 않는다.
export default function SettlementError({
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
      <p className="font-semibold">정산 정보를 불러오지 못했어요</p>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button type="button" className="min-h-11" onClick={() => retry()}>
        다시 시도
      </Button>
    </div>
  );
}
