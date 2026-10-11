import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";

// 헤더용 컴팩트 인증 버튼(로그아웃은 내 정보 탭으로 이동)
export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <Button asChild size="sm" className="min-h-11">
      <Link href="/">내 모임</Link>
    </Button>
  ) : (
    <Button asChild size="sm" variant="outline" className="min-h-11">
      <Link href="/auth/login">로그인</Link>
    </Button>
  );
}
