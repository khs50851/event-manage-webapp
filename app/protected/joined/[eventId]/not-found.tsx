import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 응답한 적 없는 회차, 본인이 만든 모임의 회차, 없는 id 모두 같은 화면으로 보낸다(존재 여부 비노출).
export default function JoinedEventNotFound() {
  return (
    <NotFoundNotice
      title="開催回が見つかりません"
      description="自分が回答した開催回ではないか、アドレスが間違っています。"
      href="/"
      linkLabel="ホームに戻る"
    />
  );
}
