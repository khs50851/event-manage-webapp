import Link from "next/link";

// 없는 회차 id로 정산 관리에 들어온 경우(연동 후에는 권한 없는 회차도 여기로 온다)
export default function SettlementNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-bold">회차를 찾을 수 없어요</h1>
      <p className="text-sm text-muted-foreground">
        삭제됐거나 주소가 잘못된 회차예요.
      </p>
      <Link
        href="/protected"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        내 모임으로 돌아가기
      </Link>
    </div>
  );
}
