# Supabase MCP 활용 가이드

이 프로젝트는 Supabase MCP 서버(`.mcp.json`의 `supabase`)가 연결되어 있다. **스키마 확인, 마이그레이션, 타입 생성, 보안/성능 점검, 로그 조회, 문서 검색을 모두 CLI나 대시보드 대신 MCP 도구로 우선 수행한다.** 이 문서는 이 프로젝트의 실제 DB 상태를 기준으로 작성되었다(최종 확인: 2026-10-03).

## 현재 DB 상태 요약 (중요)

`list_tables`로 확인한 결과, 이 Supabase 프로젝트(`cqabppajmhmlqiexidsn`)에는 **이벤트 관리 도메인과 무관한 기존 스키마**가 이미 존재한다.

| 테이블 | 용도 추정 | RLS |
|---|---|---|
| `public.instruments` | Supabase Next.js 스타터 튜토리얼 데모 테이블 | 활성화 |
| `public.accounts` | 사용자 계정 + Notion 연동 정보(`notion_api_key`, `notion_database_id`) | 활성화 |
| `public.quotes` | 견적서 (고객명, 금액, 상태, 공유 토큰 등) | 활성화 |
| `public.quote_items` | 견적서 항목 | 활성화 |

**이벤트 관리(참가자, 행사, 일정 등) 관련 테이블은 아직 하나도 없다.** 새 기능을 설계할 때 이 사실을 전제하고, 기존 `accounts`/`quotes` 스키마와 네이밍/책임이 겹치지 않도록 먼저 `list_tables(verbose: true)`로 현재 구조를 확인한 뒤 설계한다. 기존 스키마와의 관계가 불분명하면 작업 전에 사용자에게 확인한다.

또한 `list_migrations`가 빈 배열을 반환한다 — 즉 현재 테이블들은 Supabase 마이그레이션 이력 없이 생성되었다(대시보드/SQL 에디터로 직접 생성된 것으로 추정). **이 시점 이후의 모든 스키마 변경은 반드시 `apply_migration`으로 적용해 이력을 남긴다.**

## 알려진 보안/성능 이슈 (get_advisors 결과)

아래 항목은 수정 작업을 지시받기 전까지는 임의로 고치지 않는다. 단, 이 영역을 작업하게 되면 반드시 함께 해결한다.

**보안 (WARN)**
- `public.handle_new_user()`가 `SECURITY DEFINER`로 정의되어 있고 `anon`/`authenticated` 롤이 `/rest/v1/rpc/handle_new_user`로 직접 호출 가능하다. 의도치 않은 공개 RPC라면 `EXECUTE` 권한을 회수하거나 `SECURITY INVOKER`로 전환해야 한다.
- Auth의 Leaked Password Protection(유출된 비밀번호 차단)이 비활성화되어 있다.

**성능 (WARN, 총 10건)**
- `accounts`, `quotes`, `quote_items`의 RLS 정책들이 `auth.<function>()`(예: `auth.uid()`)을 행마다 재평가하고 있다. **새 RLS 정책을 작성할 때는 반드시 `auth.uid()` 대신 `(select auth.uid())` 형태로 감싸서 initplan 캐싱이 적용되도록 한다.**

```sql
-- 나쁜 예 (행마다 재평가됨)
create policy "select_own" on public.events
  for select using (owner_id = auth.uid());

-- 좋은 예 (쿼리당 한 번만 평가됨)
create policy "select_own" on public.events
  for select using (owner_id = (select auth.uid()));
```

## 필수 작업 흐름 (스키마 변경 시)

새 테이블/컬럼/정책을 추가하거나 기존 스키마를 변경할 때는 다음 순서를 따른다.

1. **`list_tables(verbose: true)`** 로 현재 스키마를 확인하고 기존 테이블과의 중복/충돌 여부를 점검한다.
2. **`apply_migration`** 으로 DDL(테이블 생성, RLS 정책, 트리거 등)을 적용한다. `execute_sql`은 조회/디버깅용 일회성 쿼리에만 사용하고, 스키마를 바꾸는 DDL에는 사용하지 않는다.
3. RLS를 반드시 활성화하고, 정책의 `auth.<function>()` 호출은 `(select ...)`로 감싼다.
4. **`get_advisors({ type: "security" })`**, **`get_advisors({ type: "performance" })`** 를 변경 직후 실행해 새 경고가 없는지 확인한다.
5. **`generate_typescript_types`** 로 타입을 재생성해 `lib/supabase/database.types.ts`(신규 파일, 현재 없음)에 반영하고, 세 클라이언트(`lib/supabase/client.ts`, `server.ts`, `proxy.ts`)의 `createBrowserClient`/`createServerClient` 제네릭에 `Database` 타입을 연결한다.

   ```ts
   // lib/supabase/client.ts 예시
   import { createBrowserClient } from "@supabase/ssr";
   import type { Database } from "@/lib/supabase/database.types";

   export function createClient() {
     return createBrowserClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
     );
   }
   ```

6. 필요하면 **`list_extensions`** 로 사용 가능한 확장을 확인한다(이미 `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`는 설치되어 있다. `gen_random_uuid()`는 `pgcrypto` 덕분에 추가 설정 없이 사용 가능).

## 디버깅 시 활용

- API/DB 에러, 인증 실패, 느린 쿼리를 조사할 때는 추측하지 말고 **`query_logs`** 로 실제 로그를 먼저 확인한다.
- Supabase JS/SSR 패키지나 Postgres 기능 사용법이 애매할 때는 **`search_docs`** 로 공식 문서를 검색해 최신 정보를 확인한다(학습 데이터가 오래되었을 수 있다).
- 클라이언트 설정값이 맞는지 확인할 때는 **`get_project_url`**, **`get_publishable_keys`** 로 실제 프로젝트 값을 조회해 `.env.local`과 비교한다. **`service_role` 키는 절대 조회/노출하지 않는다** — 클라이언트 코드에는 publishable(anon) 키만 사용한다.

## 이 프로젝트의 인증 아키텍처와의 연결

RLS 정책을 작성할 때 이 프로젝트의 인증 흐름(`CLAUDE.md` 참고)을 기억한다.

- 브라우저: `lib/supabase/client.ts` (`createBrowserClient`) — publishable 키, RLS가 유일한 방어선이다.
- 서버: `lib/supabase/server.ts` (`createServerClient` + `cookies()`) — Server Component/Action에서 매 호출마다 새로 생성.
- Proxy(미들웨어): `lib/supabase/proxy.ts`의 `updateSession()` — 세션 쿠키 갱신 및 미인증 리다이렉트.

따라서 **클라이언트 측 권한 체크를 신뢰하지 않는다.** 모든 접근 제어는 RLS 정책으로 DB 레벨에서 강제하고, 애플리케이션 코드의 `if (!user) redirect(...)`는 UX용 보조 수단으로만 취급한다.

## 관련 문서

- [[project-structure]] — Supabase 클라이언트 3분리 구조
- [[mcp-servers]] — 이 프로젝트에 연결된 전체 MCP 서버 목록과 활용 지침
