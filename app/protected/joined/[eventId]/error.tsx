"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 참여한 모임 상세의 예기치 못한 오류(없는 회차는 not-found.tsx가 처리한다).
export default function JoinedEventError({
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
      <p className="font-semibold">회차 정보를 불러오지 못했어요</p>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button type="button" className="min-h-11" onClick={() => retry()}>
        다시 시도
      </Button>
    </div>
  );
}
