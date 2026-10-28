// Supabase Auth 에러 메시지를 사용자에게 보여줄 한국어 문구로 변환한다
const DEFAULT_MESSAGE =
  "エラーが発生しました。しばらくしてからもう一度お試しください。";

// [영문 메시지 패턴, 한국어 문구] — 위에서부터 먼저 일치하는 항목을 사용한다
const AUTH_ERROR_MAP: Array<[RegExp, string]> = [
  [
    /invalid login credentials/i,
    "メールアドレスまたはパスワードが正しくありません。",
  ],
  [
    /email not confirmed/i,
    "メール認証が完了していません。受信トレイの認証リンクをタップしてください。",
  ],
  [
    /user already registered|already been registered/i,
    "すでに登録されているメールアドレスです。ログインしてください。",
  ],
  [
    /password should be at least (\d+)/i,
    "パスワードは$1文字以上で入力してください。",
  ],
  [
    /password should contain/i,
    "パスワードには英大文字・小文字、数字、記号を組み合わせてください。",
  ],
  [
    /new password should be different/i,
    "新しいパスワードは現在のパスワードと異なる必要があります。",
  ],
  [
    /weak password|password is known to be weak|pwned/i,
    "安全性の低いパスワードです。別のパスワードを使用してください。",
  ],
  [
    /unable to validate email address|invalid format|email address .* is invalid/i,
    "正しいメールアドレスを入力してください。",
  ],
  [
    /for security purposes, you can only request this after (\d+) seconds?/i,
    "セキュリティのため、$1秒後にもう一度お試しください。",
  ],
  [
    /rate limit|too many requests/i,
    "リクエストが多すぎます。しばらくしてからもう一度お試しください。",
  ],
  [
    /signups? not allowed|signup is disabled/i,
    "現在、新規登録を受け付けていません。",
  ],
  [
    /auth session missing|session.*(expired|not found)|jwt expired/i,
    "セッションの有効期限が切れました。もう一度ログインしてください。",
  ],
  [
    /token has expired or is invalid|otp.*expired|link.*(expired|invalid)/i,
    "リンクの有効期限が切れているか、正しくありません。もう一度リクエストしてください。",
  ],
  [/user not found/i, "登録されていないユーザーです。"],
  [
    /failed to fetch|network/i,
    "ネットワーク接続を確認してから、もう一度お試しください。",
  ],
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
