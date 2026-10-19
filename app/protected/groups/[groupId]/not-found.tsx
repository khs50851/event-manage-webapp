import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 없는 모임 id로 들어온 경우(연동 후에는 권한 없는 모임도 여기로 온다, PRD 7장)
export default function GroupNotFound() {
  return (
    <NotFoundNotice
      title="모임을 찾을 수 없어요"
      description="삭제됐거나 주소가 잘못된 모임이에요."
      href="/protected"
      linkLabel="대시보드로 돌아가기"
    />
  );
}
