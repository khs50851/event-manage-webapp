import { createClient } from "@/lib/supabase/server";

// 조회 함수의 데이터 출처 판단(실데이터 / 개발 미리보기 더미 / 없음)을 한 곳에 모은다.
// - 세션 있음: Supabase(RLS로 본인 소유 데이터만 조회된다)
// - 세션 없음 + 개발 환경: UI 단계 더미(lib/mock) — proxy의 isMockPreview로 로그인 없이 /protected를 열람하는 경우
// - 세션 없음 + 프로덕션: 데이터 없음(빈 결과/null). 정상 흐름에서는 페이지가 로그인으로 리다이렉트한다.
// 더미 경로는 연동 단계 I2-6(목업 미리보기 제거)·I5-3(더미 제거)에서 함께 정리한다.
// 세션 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다(cacheComponents).

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

// 세션 JWT 클레임(getClaims 결과)
export type SessionClaims = NonNullable<
  NonNullable<
    Awaited<ReturnType<ServerSupabaseClient["auth"]["getClaims"]>>["data"]
  >["claims"]
>;

export type DataSource =
  | {
      kind: "supabase";
      supabase: ServerSupabaseClient;
      userId: string;
      claims: SessionClaims;
    }
  | { kind: "mock" }
  | { kind: "none" };

// Supabase 클라이언트는 호출마다 새로 만든다(전역 보관 금지, Fluid compute).
export async function resolveDataSource(): Promise<DataSource> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claims?.sub) {
    return { kind: "supabase", supabase, userId: claims.sub, claims };
  }
  return process.env.NODE_ENV !== "production"
    ? { kind: "mock" }
    : { kind: "none" };
}

// 더미 경로 전용 인위적 지연(Suspense 스켈레톤 확인용). 실데이터 경로에는 쓰지 않는다.
const MOCK_DELAY_MS = 300;

export function mockDelay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DB id(uuid) 형식 확인. 형식이 다르면(더미 id "g-swim" 등) 조회하지 않고 "없음"으로 처리해
// Postgres 형식 오류(22P02)를 피하고 존재 여부도 드러내지 않는다.
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
