"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 초대 페이지의 예기치 못한 오류(오류 경계는 클라이언트 컴포넌트여야 한다).
// 무효·만료·취소·마감은 페이지 안에서 별도 안내하고 여기까지 오지 않는다.
// Next.js 16.3부터 retry()가 안정 API다(세그먼트를 다시 가져와 렌더링). reset()은 다시 가져오지 않으므로 쓰지 않는다.
export default function InviteError({
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
      <p className="font-semibold">초대 정보를 불러오지 못했어요</p>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 주최자에게 알려 주세요.
      </p>
      <Button type="button" className="min-h-11" onClick={() => retry()}>
        다시 시도
      </Button>
    </div>
  );
}
