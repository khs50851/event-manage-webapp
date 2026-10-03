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
- `app/protected/`는 인증이 필요한 라우트 그룹이다. 각 서버 컴포넌트는 `createClient()`(server) 후 `supabase.auth.getClaims()`로 세션을 확인하고, 없으면 `redirect("/auth/login")`을 호출한다(`app/protected/page.tsx` 참고).

### 라우트 구조

- `app/auth/*` — 로그인/회원가입/비밀번호 재설정 등 인증 관련 페이지, `app/auth/confirm/route.ts`는 이메일 확인 콜백 Route Handler
- `app/protected/*` — 인증된 사용자 전용 영역, `layout.tsx`에서 공통 네비게이션/푸터 구성
- `next.config.ts`에서 `cacheComponents: true`가 켜져 있다 → 요청별로 달라지는 데이터(쿠키, 세션 등)를 사용하는 컴포넌트는 반드시 `<Suspense>`로 감싸야 한다(`AuthButton`, `UserDetails` 등 기존 코드의 `<Suspense>` 사용 패턴 참고).

### 컴포넌트 계층

- `components/ui/` — shadcn/ui(`new-york` 스타일, `neutral` 베이스) 프리미티브. 새 프리미티브는 직접 작성하지 말고 `npx shadcn add <component>`로 추가한다.
- `components/` 최상위 — `ui/` 컴포넌트를 조합한 도메인 컴포넌트(`login-form.tsx`, `auth-button.tsx` 등). 상태/이벤트가 필요한 경우만 `"use client"`.
- 색상은 하드코딩하지 않고 `app/globals.css`에 정의된 CSS 변수 기반 디자인 토큰(`bg-background`, `text-primary` 등)을 사용하며, `tailwind.config.ts`가 이를 Tailwind 색상 유틸로 매핑한다. 클래스 병합은 항상 `lib/utils.ts`의 `cn()`을 사용한다.

### 상세 가이드

기술 스택별 상세 컨벤션은 `docs/guides/`에 정리되어 있다. 해당 영역을 작업할 때 먼저 참고한다.

- `docs/guides/nextjs-16.md` — Next.js 16 캐싱/비동기 API/Server Actions 패턴
- `docs/guides/styling-guide.md` — Tailwind + shadcn 디자인 토큰, 다크모드
- `docs/guides/component-patterns.md` — UI 프리미티브/조합 컴포넌트 작성 규칙
- `docs/guides/forms-react-hook-form.md` — 폼 작성 표준 패턴(React Hook Form, 현재 미설치 상태이며 신규 폼부터 적용 예정)
- `docs/guides/project-structure.md` — 폴더 구조와 경로 별칭(`@/*`)

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