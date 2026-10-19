import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 없는 회차 id로 정산 관리에 들어온 경우(연동 후에는 권한 없는 회차도 여기로 온다)
export default function SettlementNotFound() {
  return (
    <NotFoundNotice
      title="회차를 찾을 수 없어요"
      description="삭제됐거나 주소가 잘못된 회차예요."
      href="/protected"
      linkLabel="대시보드로 돌아가기"
    />
  );
}
