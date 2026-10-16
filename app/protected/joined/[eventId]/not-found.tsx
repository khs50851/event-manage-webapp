import Link from "next/link";

// 응답한 적 없는 회차, 본인이 만든 모임의 회차, 없는 id 모두 같은 화면으로 보낸다(존재 여부 비노출).
export default function JoinedEventNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-bold">회차를 찾을 수 없어요</h1>
      <p className="text-sm text-muted-foreground">
        내가 응답한 회차가 아니거나 주소가 잘못됐어요.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
