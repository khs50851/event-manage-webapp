# Supabase MCP 활용 가이드

이 프로젝트는 Supabase MCP 서버(`.mcp.json`의 `supabase`)가 연결되어 있다. **스키마 확인, 마이그레이션, 타입 생성, 보안/성능 점검, 로그 조회, 문서 검색을 모두 CLI나 대시보드 대신 MCP 도구로 우선 수행한다.** 이 문서는 이 프로젝트의 실제 DB 상태를 기준으로 작성되었다(최종 확인: 2026-10-12, I0 완료 시점).

## 현재 DB 상태 요약 (중요)

`.mcp.json`이 가리키는 Supabase 프로젝트는 2026-10-12에 **새 프로젝트(`ecandzpftfinazfonvcl`)로 전환**되었다. 이전 프로젝트(`cqabppajmhmlqiexidsn`)에 있던 `accounts`/`quotes`/`quote_items`/`instruments`와 `handle_new_user()`는 이 프로젝트에 **존재하지 않는다**. 이전 프로젝트를 다시 연결하는 경우 그쪽 객체는 이벤트 도메인과 무관하므로 수정하지 않는다.

이 프로젝트의 `public` 스키마는 I0에서 만든 이벤트 도메인 테이블과 사용자 프로필 테이블 9개다. 모두 RLS가 활성화되어 있다. 컬럼·제약·정책의 상세는 [`db-schema.md`](./db-schema.md)를 따른다.

| 테이블 | 용도 |
|---|---|
| `public.profiles` | 사용자 프로필(표시 이름, 프로필 사진 경로). 본인만 조회·수정, 가입 시 트리거로 생성 |
| `public.groups` | 모임. 소유자(`owner_id`)만 접근 |
| `public.group_members` | 멤버 명부 |
| `public.events` | 회차 |
| `public.event_invite_tokens` | 초대 토큰 이력(행 없음=무효, `revoked_at`=만료) |
| `public.rsvps` | 회차 응답 |
| `public.settlements` | 1/N 정산(회차와 1:1) |
| `public.settlement_tokens` | 정산 토큰 이력 |
| `public.settlement_shares` | 정산 항목(참가자별 분담) |

`list_migrations`에는 마이그레이션 9건이 있다(I1: `create_one_off_event_rpc` / I0: `harden_default_privileges_and_private_schema`, `create_groups_and_group_members`, `create_events_invite_tokens_and_rsvps`, `create_settlements_tokens_and_shares`, `create_token_access_rpcs` / 프로필: `create_profiles`, `add_profile_avatar_and_storage`, `avatar_host_read`). **이후의 모든 스키마 변경은 반드시 `apply_migration`으로 적용해 이력을 남긴다.** 새 기능을 설계할 때는 먼저 `list_tables(verbose: true)`로 현재 구조를 확인하고, 스키마와의 관계가 불분명하면 작업 전에 사용자에게 확인한다.

### 권한 모델 (새 객체를 만들 때 반드시 알아야 한다)

- **기본 권한을 회수했다.** `public`에 새로 만드는 테이블·함수에는 `anon`/`authenticated` 권한이 자동으로 붙지 않는다. API에서 쓰려면 필요한 롤에 `GRANT`를 명시해야 한다.
- 비회원(anon)은 어떤 테이블에도 권한이 없다. 토큰을 인자로 받는 RPC(`get_invite`, `submit_rsvp`, `get_settlement`, `get_settlement_share`, `report_settlement_payment`)만 호출한다.
- RPC 구현은 비노출 `private` 스키마의 `SECURITY DEFINER` 함수(`set search_path = ''`)이고, `public`에는 `SECURITY INVOKER` 래퍼만 둔다. 공개 RPC 경고(lint 0028/0029)를 피하려는 구조일 뿐 노출 범위는 같으므로, 진입점마다 `EXECUTE`를 따로 부여한다.
- `private` 스키마에 테이블을 만들면 `anon`/`authenticated`의 스키마 `USAGE`가 이미 있으므로 테이블 권한을 별도로 회수해야 한다.
- `service_role`/secret 키는 클라이언트 번들·`NEXT_PUBLIC_*`에 두지 않는다. 현재 설계는 이 키를 쓰지 않는다.

### Storage

- 비공개 버킷 `avatars`(프로필 사진): 3MB, jpeg/png/webp. 경로는 `{userId}/{uuid}.webp`이며 DB에는 `profiles.avatar_path`만 저장한다. 화면용 URL은 서버가 서명 URL로 만든다.
- `storage.objects` 정책은 본인 폴더 select/insert/delete와, 소유한 모임 회차에 응답한 참가자의 사진을 읽는 주최자 select(`private.can_read_avatar`)다. 상세는 [`db-schema.md`](./db-schema.md)의 "프로필 사진" 절을 따른다.
- Storage 파일은 SQL로 `storage.objects`를 지우지 말고 Storage API로 삭제한다(SQL 삭제는 실제 파일을 남긴다).
- 새 버킷·정책을 만들 때도 마이그레이션(`apply_migration`)으로 적용하고 기본 권한이 회수된 상태임을 전제로 정책을 명시한다.

## 알려진 보안/성능 이슈 (get_advisors 결과)

2026-10-12 기준 이 프로젝트의 advisors 결과다.

- **보안**: 경고 0건.
- **성능**: 경고 0건(프로필·Storage 마이그레이션 반영 후 재확인). 이전에 INFO로 보이던 FK 커버 인덱스 `rsvps_user_id_idx`의 `unused_index`는 사라졌다. 빈 테이블의 FK 인덱스는 사용 통계가 쌓이기 전에 이 INFO가 다시 나올 수 있으며, 의도적으로 유지한다.

이전 프로젝트에 있던 `handle_new_user()` 공개 RPC 경고와 `accounts`/`quotes`의 RLS 성능 경고 10건은 이 프로젝트에는 해당하지 않는다. Auth의 유출 비밀번호 차단(Leaked Password Protection)은 **사용하지 않기로 결정**했다(2026-10-12). 이 설정이 꺼져 있어도 의도된 상태이며, advisors에 해당 경고가 나타나면 무시한다.

**새 RLS 정책을 작성할 때는 반드시 `auth.uid()` 대신 `(select auth.uid())` 형태로 감싸서 initplan 캐싱이 적용되도록 한다.**

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
5. **`generate_typescript_types`** 로 타입을 재생성해 `lib/supabase/database.types.ts`(신규 파일, 현재 없음)에 반영(I1-1에서 생성 예정)하고, 세 클라이언트(`lib/supabase/client.ts`, `server.ts`, `proxy.ts`)의 `createBrowserClient`/`createServerClient` 제네릭에 `Database` 타입을 연결한다.

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

6. 필요하면 **`list_extensions`** 로 사용 가능한 확장을 확인한다(이 프로젝트에는 `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `plpgsql`이 설치되어 있다. `gen_random_uuid()`는 별도 설정 없이 사용 가능하며, 토큰 생성은 `private.generate_token`(192비트 base64url)을 쓴다).

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

- [`db-schema.md`](./db-schema.md) — 이벤트 도메인 스키마·RLS·토큰 RPC 설계 결정(I0)
- [[project-structure]] — Supabase 클라이언트 3분리 구조
- [[mcp-servers]] — 이 프로젝트에 연결된 전체 MCP 서버 목록과 활용 지침
