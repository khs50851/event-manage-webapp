import { cookies } from "next/headers";

import { isUuid } from "@/lib/data/source";

// 비회원 응답자 식별자(respondent_key) 쿠키. 같은 기기에서 다시 열었을 때 내 응답을 찾는 데 쓴다.
// - httpOnly: 클라이언트 스크립트가 읽거나 바꿀 수 없다. 값은 서버가 get_invite/submit_rsvp에 전달한다.
// - 발급(set)은 Server Action(ensureRespondentKey)에서만 한다. 렌더링 중에는 읽기만 한다(readRespondentKey).
// - 경로는 초대 페이지(/i/*)로 한정한다. 초대 페이지의 Server Action 요청도 같은 경로로 전송된다.
// - 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다(cacheComponents).
// 로그인 사용자는 계정(user_id)으로만 매칭하므로(Q11) 이 값은 비로그인 상태에서만 의미가 있다.

export const RESPONDENT_KEY_COOKIE = "rsvp_respondent_key";

// 1년. 브라우저 상한(약 400일) 안쪽으로 둔다.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// 저장된 키(형식이 uuid가 아니면 없는 것으로 본다)
export async function readRespondentKey(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(RESPONDENT_KEY_COOKIE)?.value;
  return value && isUuid(value) ? value : null;
}

// Server Action 전용: 키가 없으면 새로 발급해 쿠키에 저장하고 돌려준다.
export async function ensureRespondentKey(): Promise<string> {
  const existing = await readRespondentKey();
  if (existing) return existing;

  const key = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(RESPONDENT_KEY_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/i",
    maxAge: MAX_AGE_SECONDS,
  });
  return key;
}
