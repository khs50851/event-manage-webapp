// Supabase Auth 에러 메시지를 사용자에게 보여줄 한국어 문구로 변환한다
const DEFAULT_MESSAGE = "오류가 발생했어요. 잠시 후 다시 시도해 주세요.";

// [영문 메시지 패턴, 한국어 문구] — 위에서부터 먼저 일치하는 항목을 사용한다
const AUTH_ERROR_MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않아요."],
  [
    /email not confirmed/i,
    "이메일 인증이 완료되지 않았어요. 받은 메일함에서 인증 링크를 눌러 주세요.",
  ],
  [
    /user already registered|already been registered/i,
    "이미 가입된 이메일이에요. 로그인해 주세요.",
  ],
  [
    /password should be at least (\d+)/i,
    "비밀번호는 최소 $1자 이상이어야 해요.",
  ],
  [
    /password should contain/i,
    "비밀번호에 영문 대소문자, 숫자, 특수문자를 조합해 주세요.",
  ],
  [
    /new password should be different/i,
    "새 비밀번호는 기존 비밀번호와 달라야 해요.",
  ],
  [
    /weak password|password is known to be weak|pwned/i,
    "보안에 취약한 비밀번호예요. 다른 비밀번호를 사용해 주세요.",
  ],
  [
    /unable to validate email address|invalid format|email address .* is invalid/i,
    "올바른 이메일 주소를 입력해 주세요.",
  ],
  [
    /for security purposes, you can only request this after (\d+) seconds?/i,
    "보안을 위해 $1초 후에 다시 시도해 주세요.",
  ],
  [
    /rate limit|too many requests/i,
    "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  ],
  [
    /signups? not allowed|signup is disabled/i,
    "지금은 회원가입을 받을 수 없어요.",
  ],
  [
    /auth session missing|session.*(expired|not found)|jwt expired/i,
    "세션이 만료됐어요. 다시 로그인해 주세요.",
  ],
  [
    /token has expired or is invalid|otp.*expired|link.*(expired|invalid)/i,
    "링크가 만료됐거나 올바르지 않아요. 다시 요청해 주세요.",
  ],
  [/user not found/i, "가입되지 않은 사용자예요."],
  [/failed to fetch|network/i, "네트워크 연결을 확인한 뒤 다시 시도해 주세요."],
];

export function toKoreanAuthError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";

  if (!message) return DEFAULT_MESSAGE;

  for (const [pattern, korean] of AUTH_ERROR_MAP) {
    const match = message.match(pattern);
    // 캡처 그룹($1)이 있으면 숫자 등을 그대로 치환한다
    if (match) return korean.replace("$1", match[1] ?? "");
  }

  return DEFAULT_MESSAGE;
}
