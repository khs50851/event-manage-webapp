import Link from "next/link";

// 없는 모임 id로 들어온 경우(연동 후에는 권한 없는 모임도 여기로 온다, PRD 7장)
export default function GroupNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-bold">모임을 찾을 수 없어요</h1>
      <p className="text-sm text-muted-foreground">
        삭제됐거나 주소가 잘못된 모임이에요.
      </p>
      <Link
        href="/protected"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
