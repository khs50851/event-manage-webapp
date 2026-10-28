import { NotFoundNotice } from "@/components/layout/not-found-notice";

// 없는 회차 id로 정산 관리에 들어온 경우(연동 후에는 권한 없는 회차도 여기로 온다)
export default function SettlementNotFound() {
  return (
    <NotFoundNotice
      title="開催回が見つかりません"
      description="削除されたか、アドレスが間違っている開催回です。"
      href="/protected"
      linkLabel="ダッシュボードに戻る"
    />
  );
}
