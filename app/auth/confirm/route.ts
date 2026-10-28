import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// 에러 페이지(/auth/error)로 코드값을 넘긴다. 문구 변환은 에러 페이지가 담당한다.
function errorRedirect(code: string): never {
  redirect(`/auth/error?error=${encodeURIComponent(code)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // 인증 완료 후 지정된 경로(기본값 홈)로 이동
      redirect(next);
    }
    // Supabase 에러 코드(예: otp_expired)가 있으면 그대로, 없으면 일반 코드로 전달
    errorRedirect(error.code ?? "verify_failed");
  }

  // token_hash 또는 type 이 없는 잘못된 링크
  errorRedirect("missing_token");
}
