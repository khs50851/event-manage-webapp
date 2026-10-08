import {
  AuthErrorNotice,
  type AuthErrorKind,
} from "@/components/auth-error-notice";
import { Suspense } from "react";

// 사용자가 인증을 직접 취소했을 때 OAuth 공급자가 돌려주는 대표 코드
const CANCELLED_CODES = ["access_denied", "user_cancelled"];

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const kind: AuthErrorKind = CANCELLED_CODES.includes(params?.error ?? "")
    ? "cancelled"
    : "failed";

  return <AuthErrorNotice kind={kind} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
