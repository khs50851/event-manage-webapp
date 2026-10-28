import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 없는 모임 id로 들어온 경우(연동 후에는 권한 없는 모임도 여기로 온다, PRD 7장)
export default function GroupNotFound() {
  return (
    <NotFoundNotice
      title="グループが見つかりません"
      description="削除されたか、アドレスが間違っているグループです。"
      href="/protected"
      linkLabel="ダッシュボードに戻る"
    />
  );
}
