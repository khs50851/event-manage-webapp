import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 응답한 적 없는 회차, 본인이 만든 모임의 회차, 없는 id 모두 같은 화면으로 보낸다(존재 여부 비노출).
export default function JoinedEventNotFound() {
  return (
    <NotFoundNotice
      title="회차를 찾을 수 없어요"
      description="내가 응답한 회차가 아니거나 주소가 잘못됐어요."
      href="/"
      linkLabel="홈으로 돌아가기"
    />
  );
}
