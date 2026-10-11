# 프로젝트 구조 가이드

이 문서는 `event-manage-webapp`의 디렉터리 구조와 각 폴더의 역할, 파일 네이밍 규칙을 정리합니다.

## 기술 스택 요약

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **런타임/UI**: React 19
- **언어**: TypeScript (strict 모드)
- **스타일링**: Tailwind CSS 3.4 + shadcn/ui (`new-york` 스타일)
- **백엔드/인증**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **테마**: next-themes (다크모드)
- **아이콘**: lucide-react

## 디렉터리 구조

```
event-manage-webapp/
├── app/                    # App Router 라우트 (페이지, 레이아웃, API 라우트)
│   ├── auth/               # 인증 관련 라우트 (login, sign-up, 비밀번호 재설정 등)
│   ├── protected/          # 로그인한 사용자만 접근 가능한 라우트
│   ├── layout.tsx          # 루트 레이아웃 (폰트, ThemeProvider 설정)
│   ├── page.tsx            # 루트 페이지 (/)
│   └── globals.css         # Tailwind 지시문 + CSS 변수(테마 토큰) 정의
├── components/             # 재사용 가능한 React 컴포넌트
│   ├── ui/                 # shadcn/ui 기반 저수준 프리미티브 컴포넌트
│   ├── layout/             # 모바일 셸(mobile-shell, app-header, bottom-tab-bar)
│   └── groups/ rsvp/       # 도메인 컴포넌트
├── lib/                    # 유틸리티, 외부 서비스 클라이언트
│   └── supabase/           # Supabase 클라이언트 생성 함수 (client/server/proxy)
├── docs/                   # 프로젝트 문서
│   └── guides/             # 기술 스택별 가이드 (현재 문서가 속한 폴더)
├── components.json         # shadcn/ui CLI 설정
├── tailwind.config.ts      # Tailwind 테마/플러그인 설정
├── next.config.ts          # Next.js 설정
└── tsconfig.json           # TypeScript 설정 (경로 별칭 포함)
```

## 경로 별칭 (Path Alias)

`tsconfig.json`과 `components.json`에 정의된 별칭을 사용합니다.

| 별칭 | 실제 경로 | 용도 |
|---|---|---|
| `@/*` | `./*` | 프로젝트 루트 기준 전체 |
| `@/components` | `./components` | 일반 컴포넌트 |
| `@/components/ui` | `./components/ui` | shadcn/ui 프리미티브 |
| `@/lib` | `./lib` | 유틸리티, 클라이언트 |
| `@/hooks` | `./hooks` | 커스텀 훅 (아직 미생성, shadcn CLI가 사용) |

```tsx
// 상대 경로 대신 항상 별칭을 사용한다
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

## 폴더별 규칙

### `app/`
- 라우팅 세그먼트 단위로 폴더를 구성한다 (`app/auth/login/page.tsx`).
- 라우트 그룹이 필요하면 `(group-name)` 형식의 폴더를 사용해 URL에 영향을 주지 않고 레이아웃을 분리한다.
- 서버 전용 로직(DB 조회, 세션 확인)은 가능한 한 `page.tsx`/`layout.tsx` 서버 컴포넌트에서 처리하고, 상호작용이 필요한 부분만 `"use client"` 컴포넌트로 분리한다.

### `components/`
- **`components/ui/`**: shadcn CLI(`npx shadcn add <component>`)로 생성된 파일만 둔다. 직접 커스터마이징은 허용되지만, 구조(variant 패턴, `forwardRef` 등)는 유지한다.
- **`components/`(최상위)**: 도메인 로직이 섞인 조합 컴포넌트(`login-form.tsx`, `auth-button.tsx` 등)를 둔다. 여러 `ui/` 컴포넌트를 조합해 기능 단위로 만든다.
- 기능이 커지면 `components/<도메인>/` 형태로 하위 폴더를 만든다 (예: `components/groups/`).

### `lib/`
- 외부 서비스 클라이언트(`lib/supabase/client.ts`, `server.ts`)와 순수 유틸 함수(`lib/utils.ts`)를 둔다.
- 브라우저용 클라이언트와 서버용 클라이언트를 명확히 분리한다 (`client.ts` vs `server.ts`).

## 파일 네이밍 규칙

- 컴포넌트 파일: `kebab-case.tsx` (예: `login-form.tsx`), export하는 컴포넌트명은 `PascalCase` (예: `LoginForm`).
- 유틸/설정 파일: `kebab-case.ts` (예: `utils.ts`).
- 라우트 파일: Next.js 규칙을 그대로 따른다 (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`).

## 새 기능 추가 시 체크리스트

1. 라우트가 필요하면 `app/` 하위에 세그먼트 폴더 생성
2. UI 프리미티브가 부족하면 `npx shadcn add <component>`로 `components/ui/`에 추가
3. 도메인 컴포넌트는 `components/<도메인>/` 아래에 작성
4. 서버 전용 로직은 `lib/`에 함수로 분리해 재사용성 확보
5. 공통 스타일/디자인 토큰 관련 사항은 [[styling-guide]] 참고
6. 폼이 필요하면 [[forms-react-hook-form]] 패턴을 따른다
