# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 + Supabase Auth 스타터 킷을 기반으로 한 이벤트 관리 웹앱. 쿠키 기반 세션을 사용하는 Supabase Auth가 Client Component, Server Component, Route Handler, Proxy(미들웨어) 전반에 통합되어 있다.

## 명령어

```bash
npm run dev           # 개발 서버 (Turbopack, http://localhost:3000)
npm run build         # 프로덕션 빌드
npm run start         # 프로덕션 서버 실행

npm run lint          # ESLint 검사
npm run lint:fix      # ESLint 자동 수정
npm run type-check    # tsc --noEmit (타입만 검사, 빌드 산출물 없음)
npm run format        # Prettier로 전체 포맷팅
npm run format:check  # Prettier 포맷 검사만 (CI/커밋 전 확인용)
npm run check-all     # lint + type-check + format:check 통합 실행

npx shadcn add <component>   # 새 shadcn/ui 프리미티브 추가
```

새 코드를 커밋하기 전에는 `npm run check-all`로 한 번에 검증한다. 테스트 프레임워크는 아직 설정되어 있지 않다(`package.json`에 test 스크립트 없음).

## 환경 변수

`.env.local`에 아래 값이 필요하다 (없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 UI에 `EnvVarWarning`이 표시되고, proxy의 세션 체크도 스킵된다).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## 아키텍처

### 인증 흐름 (핵심 구조)

이 저장소는 **세 개의 서로 다른 Supabase 클라이언트**를 컨텍스트별로 분리해서 사용한다. 새 코드를 작성할 때 반드시 올바른 클라이언트를 선택해야 한다.

| 파일 | 실행 컨텍스트 | 용도 |
|---|---|---|
| `lib/supabase/client.ts` | 브라우저 (Client Component) | `createBrowserClient` |
| `lib/supabase/server.ts` | 서버 (Server Component/Action/Route Handler) | `createServerClient` + `next/headers`의 `cookies()`. 매 함수 호출마다 새로 생성해야 하며 전역 변수에 담으면 안 된다(Fluid compute 대응) |
| `lib/supabase/proxy.ts` | Proxy(미들웨어) | `updateSession()` — 세션 쿠키 갱신과 미인증 리다이렉트 담당 |

- `proxy.ts`(루트)가 모든 요청에 대해 `lib/supabase/proxy.ts`의 `updateSession()`을 호출한다. **Next.js 16부터 미들웨어 파일명이 `middleware.ts`/`middleware()`에서 `proxy.ts`/`proxy()`로 변경**되었다 — 과거 Next.js 문서나 예제에서 `middleware`를 언급해도 이 저장소에서는 `proxy`로 대응된다.
- `updateSession()`은 `supabase.auth.getClaims()` 호출 전후로 응답 객체를 다루는 순서가 매우 엄격하다(쿠키 동기화가 깨지면 사용자가 무작위로 로그아웃됨). 이 함수를 수정할 때는 파일 내 주석의 경고를 그대로 따른다.
- 인증되지 않은 사용자가 `/`, `/login*`, `/auth*` 외의 경로에 접근하면 `/auth/login`으로 리다이렉트된다.
- `app/protected/`는 인증이 필요한 라우트 그룹이다. 각 서버 컴포넌트는 `createClient()`(server) 후 `supabase.auth.getClaims()`로 세션을 확인하고, 없으면 `redirect("/auth/login")`을 호출한다.
- 로그인 후 진입점은 홈(`/`)이다. 홈은 로그인 상태면 내 모임/참여한 모임 목록(`components/groups/home-groups.tsx`)과 하단 탭바를, 비로그인 상태면 히어로 + `GuestAuthNotice`를 보여준다(세션 확인을 포함한 셸 전체를 `<Suspense>` 안에서 구성, `app/page.tsx` 참고). `/protected`는 주최자 대시보드다(`app/protected/(dashboard)/page.tsx`): 7일 이내 회차·응답 미완료 회차·미입금 정산 카드와 내 모임 목록을 보여주며(집계는 `lib/dashboard.ts`, 조회는 `lib/data/dashboard.ts`), 하단 탭바의 "홈" 탭이 이곳을 가리킨다.
- 로그인한 사용자가 `/auth/login`·`/auth/sign-up`에 접근하면 proxy가 `/`로 리다이렉트한다(그 외 auth 경로는 영향 없음). 이메일 확인 콜백(`app/auth/confirm/route.ts`)의 `next`는 `/`로 시작하는 상대 경로만 허용하며 기본값은 `/`이다.

### 라우트 구조

- `app/auth/*` — 로그인/회원가입/비밀번호 재설정 등 인증 관련 페이지, `app/auth/confirm/route.ts`는 이메일 확인 콜백 Route Handler
- `app/protected/*` — 인증된 사용자 전용 영역, `layout.tsx`에서 공통 네비게이션/푸터 구성
- `next.config.ts`에서 `cacheComponents: true`가 켜져 있다 → 요청별로 달라지는 데이터(쿠키, 세션 등)를 사용하는 컴포넌트는 반드시 `<Suspense>`로 감싸야 한다(`AuthButton`, `UserDetails` 등 기존 코드의 `<Suspense>` 사용 패턴 참고).

### 컴포넌트 계층

- `components/ui/` — shadcn/ui(`new-york` 스타일, `neutral` 베이스) 프리미티브. 새 프리미티브는 직접 작성하지 말고 `npx shadcn add <component>`로 추가한다.
- `components/` 최상위 — `ui/` 컴포넌트를 조합한 도메인 컴포넌트(`login-form.tsx`, `auth-button.tsx` 등). 상태/이벤트가 필요한 경우만 `"use client"`.
- 색상은 하드코딩하지 않고 `app/globals.css`에 정의된 CSS 변수 기반 디자인 토큰(`bg-background`, `text-primary` 등)을 사용하며, 같은 파일의 `@theme inline`이 이를 Tailwind v4 색상 유틸로 매핑한다(`tailwind.config` 파일은 없다). 클래스 병합은 항상 `lib/utils.ts`의 `cn()`을 사용한다.

### 상세 가이드

기술 스택별 상세 컨벤션은 `docs/guides/`에 정리되어 있다. 해당 영역을 작업할 때 먼저 참고한다.

- `docs/guides/nextjs-16.md` — Next.js 16 캐싱/비동기 API/Server Actions 패턴
- `docs/guides/styling-guide.md` — Tailwind + shadcn 디자인 토큰, 다크모드
- `docs/guides/component-patterns.md` — UI 프리미티브/조합 컴포넌트 작성 규칙
- `docs/guides/forms-react-hook-form.md` — 폼 작성 표준 패턴(React Hook Form, 현재 미설치 상태이며 신규 폼부터 적용 예정)
- `docs/guides/project-structure.md` — 폴더 구조와 경로 별칭(`@/*`)
- `docs/guides/supabase-mcp.md` — Supabase MCP 도구 활용 워크플로, 현재 DB 상태와 알려진 보안/성능 이슈
- `docs/guides/db-schema.md` — 이벤트 도메인 스키마·RLS·토큰 RPC 설계 결정(I0)
- `docs/guides/mcp-servers.md` — 연결된 전체 MCP 서버(`supabase`/`context7`/`shadcn`/`playwright`/`sequential-thinking`) 활용 지침

## Next.js 16 작업 규칙

코드를 작성할 때 다음을 기본 규칙으로 따른다(배경은 [[nextjs-16]] 참고).

1. `cookies()`, `headers()`, 동적 라우트의 `params`/`searchParams`는 모두 Promise다 — 항상 `await` 한다. 동기 접근 코드를 작성하지 않는다.
2. `next.config.ts`의 `cacheComponents: true`로 인해, 요청마다 달라지는 데이터(쿠키/세션/요청 시점 fetch)를 읽는 컴포넌트는 반드시 `<Suspense>`로 감싼다. 감싸지 않으면 빌드 에러가 난다.
3. 기본은 서버 컴포넌트다. `useState`/이벤트 핸들러/브라우저 API가 필요한 최소 단위에만 `"use client"`를 붙인다.
4. 폼 제출·데이터 변경(mutation)은 Server Action을 우선 검토한다. 기존 `login-form.tsx`류의 `onSubmit` + `useState` 패턴은 레거시이며, 새 폼은 [[forms-react-hook-form]] 패턴(React Hook Form + Zod + Server Action)을 따른다.
5. 정적으로 캐시 가능한 데이터 조회 함수에는 `"use cache"`를 쓰고, 그렇지 않은 동적 조회는 캐시하지 않는다(섣불리 `force-cache`를 걸지 않는다).
6. 이 저장소에서 미들웨어는 `middleware.ts`가 아니라 `proxy.ts`(`proxy()` 함수)다 — 과거 Next.js 지식으로 `middleware.ts`를 새로 만들지 않는다.

## Supabase 데이터베이스 현황

실제 상태는 `mcp__supabase__list_tables`/`get_advisors`로 직접 확인한다(아래는 2026-10-12 I0 완료 시점 스냅샷이므로 시간이 지나면 재확인 필요). 자세한 워크플로는 [[supabase-mcp]], 스키마 설계 결정은 `docs/guides/db-schema.md` 참고.

- **현재 연결된 프로젝트**(`.mcp.json`, 2026-10-12 기준 `ecandzpftfinazfonvcl`)는 이전 프로젝트와 다른 새 프로젝트다. 기존 `accounts`/`quotes`/`quote_items`/`instruments`와 `handle_new_user()`는 이 프로젝트에 **존재하지 않는다**. 이전 프로젝트를 다시 연결하면 그쪽 객체는 수정하지 않는다.
- **이벤트 도메인 스키마(I0 완료)**: `groups`, `group_members`, `events`, `event_invite_tokens`, `rsvps`, `settlements`, `settlement_tokens`, `settlement_shares` 8개 테이블과 사용자 프로필 `profiles`, 전부 RLS 활성. 마이그레이션 이력 8건(`list_migrations`)이 기준이며 **이후 모든 DDL은 `apply_migration`으로 적용**한다.
- **프로필·사진**: `profiles`는 가입 트리거로 생성되며 행이 없을 수 있으므로 앱은 대체 이름 규칙을 둔다. 프로필 사진은 비공개 버킷 `avatars`(3MB, jpeg/png/webp)에 저장하고 DB에는 경로만 둔다. 상세는 `docs/guides/db-schema.md`.
- **권한 모델**: 기본 권한(default privileges)을 회수했다. `public`에 새 테이블·함수를 만들면 필요한 롤에 GRANT를 명시해야 API에 보인다. RLS 정책은 반드시 `(select auth.uid())` 형태로 작성한다.
- **비회원 접근**: anon은 테이블 권한이 없고, 토큰을 인자로 받는 RPC(`get_invite`, `submit_rsvp`, `get_settlement`, `get_settlement_share`, `report_settlement_payment`)만 호출한다. 구현은 비노출 `private` 스키마의 SECURITY DEFINER 함수, `public`에는 SECURITY INVOKER 래퍼만 둔다. `service_role`/secret 키는 클라이언트 번들에 넣지 않는다.
- advisors(2026-10-12, 프로필·Storage 반영 후): security 0건, performance 0건. Leaked Password Protection은 사용하지 않기로 결정했다.
- 후속 과제: DB 레이트리밋(I3, publishable 키로 RPC를 직접 호출하면 Server Action의 제한을 우회할 수 있음), 타인 항목 조회 방지(I4-3), "참여한 모임" 목록 RPC(I3-6a, 기준은 PRD Q12: 로그인 상태로 응답한 모임, 읽기 전용).
- `lib/supabase/database.types.ts`(Supabase 생성 타입)가 아직 없다 — I1-1에서 `generate_typescript_types`로 생성해 세 클라이언트에 연결한다.

## MCP 서버 활용 지침

이 프로젝트(`.mcp.json`)에는 `supabase`, `context7`, `shadcn`, `playwright`, `sequential-thinking` MCP 서버가 연결되어 있다. **추측 가능한 것도 추측하지 말고 해당 MCP 도구로 먼저 확인한다.** 상세 매핑은 [[mcp-servers]] 참고.

- DB 스키마/마이그레이션/보안·성능 점검/로그/타입 생성 → `supabase` MCP ([[supabase-mcp]] 워크플로 그대로 따른다)
- Next.js 16, React 19, `@supabase/ssr`, shadcn/Radix, Tailwind 등 빠르게 변하는 라이브러리의 최신 API/문서 확인 → `context7` (추측하지 말고 조회)
- 새 UI 프리미티브 추가 → 직접 작성 전에 `shadcn` MCP로 레지스트리 검색 후 설치 명령 사용
- 인증/폼 플로우처럼 실제 브라우저 동작 확인이 필요한 변경 → `playwright`로 직접 조작해 검증(빌드 성공만으로 완료 처리하지 않는다)
- 되돌리기 어려운 스키마 설계, 원인이 바로 안 보이는 버그처럼 여러 단계 트레이드오프를 구조화해야 하는 경우 → `sequential-thinking`

## 개발 도구 설정

- **ESLint**: `eslint.config.mjs`(flat config). `eslint-config-next`가 16.x부터 `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript` 서브패스로 **flat config 배열을 직접 export**한다. 구버전처럼 `FlatCompat.extends("next/core-web-vitals", ...)`로 불러오면 플러그인 객체 순환 참조로 `TypeError: Converting circular structure to JSON`이 발생하므로 반드시 서브패스 import를 사용한다. `eslint-config-prettier`를 배열 마지막에 추가해 포맷 관련 규칙과 충돌을 막는다.
- **Prettier**: `.prettierrc.json` (`prettier-plugin-tailwindcss`로 Tailwind 클래스 자동 정렬, `cn`/`cva` 함수 인자까지 인식). `.md` 파일은 `.prettierignore`에서 제외했다(문서 서식 보존 목적, 필요 시 제거 가능).
- **TypeScript**: `npm run type-check`(`tsc --noEmit`)로 빌드 없이 타입만 검사.
- **Husky + lint-staged**: `.husky/pre-commit`이 `npx lint-staged`(스테이징된 파일에 ESLint `--fix` + Prettier 적용) 후 `npm run type-check`(전체 프로젝트)를 실행한다. `.husky/commit-msg`는 commitlint로 커밋 메시지 형식을 검사한다.
- **commitlint**: `commitlint.config.mjs`, `@commitlint/config-conventional` 기반. type은 영어 conventional 규칙(`feat`, `fix`, `chore` 등)을 따르고 `subject-case` 규칙은 꺼뒀으므로 설명은 한국어로 작성한다(예: `feat: 로그인 폼에 유효성 검사 추가`).
- **CI**: `.github/workflows/ci.yml`이 PR/main 푸시 시 lint → type-check → format:check → build를 순서대로 실행한다. 빌드에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` GitHub Secrets가 필요하다.
- **에디터 연동**: `.vscode/settings.json`(저장 시 ESLint 자동 수정 + Prettier 포맷, Tailwind IntelliSense가 `cn`/`cva` 안의 클래스도 인식하도록 설정), `.vscode/extensions.json`(권장 확장: ESLint, Prettier, Tailwind CSS IntelliSense, EditorConfig), `.editorconfig`(공통 들여쓰기/개행 규칙).

## 작업 완료 체크리스트

```bash
npm run check-all   # lint + type-check + format:check 통과 확인
npm run build       # 빌드 성공 확인
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
