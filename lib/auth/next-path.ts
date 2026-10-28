// open redirect 방지: 같은 사이트의 상대 경로("/"로 시작하고 "//", "/\"가 아닌 값)만 허용한다
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
