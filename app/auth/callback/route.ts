import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// 에러 페이지(/auth/error)로 코드값을 넘긴다. 문구 변환은 에러 페이지가 담당한다.
function errorRedirect(code: string): never {
  redirect(`/auth/error?error=${encodeURIComponent(code)}`);
}

// OAuth(Google) 로그인 콜백: 인증 코드를 세션으로 교환한다(PKCE).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const next = safeNextPath(searchParams.get("next"));

  // 사용자가 동의 화면에서 취소하면 공급자가 error=access_denied 로 돌려보낸다
  if (providerError) errorRedirect(providerError);
  if (!code) errorRedirect("missing_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) errorRedirect(error.code ?? "exchange_failed");

  redirect(next);
}
