import { redirect } from "next/navigation";

// 모임 목록은 홈(/)으로 통합되었다. 기존 북마크 호환을 위해 /protected 는 홈으로 보낸다.
export default function ProtectedPage() {
  redirect("/");
}
