# 코드 리뷰 결과 (modified-code-1) — 에이전트 1

- 실행일: 2026-10-20
- 리뷰 범위: `app/auth/**`, `app/i/**`, `app/s/**`, `app/actions/**`, `app/` 루트 파일, `components/` 최상위 파일, `lib/auth/**`, `lib/actions/**`, `lib/schemas/**`, `lib/supabase/**`
- 검증: `npm run check-all` 통과(lint, type-check, format:check). playwright로 `/auth/login` 화면 확인(레이아웃 동일, 콘솔 에러 0건)

## 요약
| 구분 | 건수 |
|---|---|
| 적용한 변경 | 8 |
| 제안(미적용) | 7 |
| 수정한 파일 | 28 (신규 2 포함) |

인증 페이지 6곳에 복제된 가운데 정렬 래퍼를 `app/auth/layout.tsx`로 올리고, 인증 폼 4곳의 오류 문구를 `AuthFormError`로 추출했다. Server Action과 Zod 스키마에 흩어진 공통 문구와 이름 규칙은 `lib/actions/shared.ts`의 `MESSAGES`와 새 `lib/schemas/common.ts`로 모았다.

참고: `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `components/google-sign-in-button.tsx`, `lib/auth/next-path.ts`, `lib/supabase/proxy.ts`는 리뷰 시작 전부터 커밋되지 않은 변경(진행 중인 작업)이 있었다. 리뷰는 했지만 이번에 수정하지 않았고, 아래 diff 통계에도 넣지 않았다.

## 적용한 변경

### 1. 인증 페이지 공통 래퍼를 레이아웃으로 이동 — `공통화`
- **무엇이 문제였나:** `<div className="flex w-full flex-1 items-center justify-center py-4"><div className="w-full">` 래퍼가 인증 페이지 6곳에 똑같이 들어 있었다(`app/auth/login/page.tsx:5-6`, `sign-up/page.tsx:5-6`, `forgot-password/page.tsx:5-6`, `update-password/page.tsx:5-6`, `sign-up-success/page.tsx:11-12`, `error/page.tsx:29-30`).
- **어떻게 바꿨나:** 래퍼를 `app/auth/layout.tsx`의 `MobileShell` 안으로 옮기고, 각 페이지는 내용만 반환하게 했다. `confirm`과 `callback`은 Route Handler라서 레이아웃의 영향을 받지 않는다.
- **영향 파일:** `app/auth/layout.tsx`, `app/auth/{login,sign-up,forgot-password,update-password,sign-up-success,error}/page.tsx`
- **동작 변화:** 없음(DOM 구조 동일, `/auth/login` 화면 확인)

### 2. 인증 폼 오류 문구 컴포넌트 추출 — `공통화`
- **무엇이 문제였나:** `{error && <p role="alert" className="text-sm text-destructive">{error}</p>}`가 4곳에 복제돼 있었다(`components/login-form.tsx:101`, `sign-up-form.tsx:121`, `forgot-password-form.tsx:94`, `update-password-form.tsx:73`).
- **어떻게 바꿨나:** `components/auth-form-error.tsx`에 `AuthFormError({ message })`를 만들었다. 메시지가 없으면 `null`을 반환한다. 네 폼의 해당 부분을 이 컴포넌트로 교체했다.
- **영향 파일:** `components/auth-form-error.tsx`(신규), `components/login-form.tsx`, `components/sign-up-form.tsx`, `components/forgot-password-form.tsx`, `components/update-password-form.tsx`
- **동작 변화:** 없음

### 3. Server Action 공통 문구 통합 — `공통화`
- **무엇이 문제였나:** "회차를 찾을 수 없어요."가 `app/actions/events.ts:34`, `rsvps.ts:30`, `invites.ts:155,163`에 있었고, "모임을 찾을 수 없어요."는 `events.ts:33`, `groups.ts:27`, `members.ts:25`에, "로그인이 필요해요."는 `profile.ts:27`과 `lib/actions/shared.ts:13`에 따로 적혀 있었다.
- **어떻게 바꿨나:** `lib/actions/shared.ts`의 `MESSAGES`에 `groupNotFound`와 `eventNotFound`를 추가했다. 각 액션 파일은 `MESSAGES as COMMON_MESSAGES`로 가져와 자기 `MESSAGES` 항목에서 참조한다. `invites.ts`에 직접 적혀 있던 문구도 이 상수로 바꿨다.
- **영향 파일:** `lib/actions/shared.ts`, `app/actions/{events,groups,members,rsvps,invites,profile}.ts`
- **동작 변화:** 없음(문구 동일, `ActionResult` 계약 그대로)

### 4. `profile.ts`의 `ServerSupabaseClient` 중복 정의 제거 — `정합성`
- **무엇이 문제였나:** `app/actions/profile.ts:42`가 `lib/actions/shared.ts:10`에서 이미 export하는 타입을 다시 정의하고 있었다.
- **어떻게 바꿨나:** `@/lib/actions/shared`에서 `type ServerSupabaseClient`를 import하도록 바꿨다.
- **영향 파일:** `app/actions/profile.ts`
- **동작 변화:** 없음

### 5. 이름 스키마와 응답 마감 문구 통합 — `공통화`
- **무엇이 문제였나:** 이름 1~30자 규칙(`trim().min(1, "이름을 입력해 주세요.").max(30, "이름은 30자 이하로 입력해 주세요.")`)이 `lib/schemas/member.ts:4-8`, `rsvp.ts:9-13`, `profile.ts:28-32`에 3번 복제돼 있었다. "응답 마감은 시작 시각보다 늦을 수 없어요."는 `lib/schemas/event.ts:32`, `rsvp.ts:28`, `app/actions/events.ts:41`에 있었다.
- **어떻게 바꿨나:** `lib/schemas/common.ts`를 새로 만들어 `personNameSchema`와 `RSVP_DEADLINE_AFTER_START_MESSAGE`를 두고 세 스키마와 액션에서 참조한다. 외부 공개 이름은 그대로 두기 위해 `displayNameSchema`는 `personNameSchema`의 별칭으로 남겼다.
- **영향 파일:** `lib/schemas/common.ts`(신규), `lib/schemas/{member,rsvp,profile,event}.ts`, `app/actions/events.ts`
- **동작 변화:** 없음(Zod 스키마는 불변이라 공유해도 안전하다)

### 6. 모임 목록 재검증 경로 헬퍼 분리 — `품질`
- **무엇이 문제였나:** `app/actions/groups.ts`의 `deleteGroup`이 `revalidateGroupPaths`에 있는 `/`, `/protected`, `/protected/me` 세 줄을 다시 적고 있었다(원래 161-163행). 경로를 추가할 때 한쪽만 고칠 위험이 있었다.
- **어떻게 바꿨나:** `revalidateGroupListPaths()`를 추출했다. `revalidateGroupPaths`와 `deleteGroup`이 이 헬퍼를 호출한다. `deleteGroup`은 지금처럼 모임 상세 경로를 재검증하지 않는다.
- **영향 파일:** `app/actions/groups.ts`
- **동작 변화:** 없음

### 7. 홈 세션 확인을 데이터 계층 함수로 교체 — `정합성`
- **무엇이 문제였나:** `app/page.tsx:62-67`이 `createClient()` 후 `getClaims()`를 직접 호출해 로그인 여부를 판단했다. 같은 역할의 `lib/data/source.ts`의 `getIsLoggedIn()`을 두고 중복 구현한 것이다(화면은 `lib/data/*`를 호출한다는 데이터 계층 규칙과도 어긋난다).
- **어떻게 바꿨나:** `const isLoggedIn = hasEnvVars ? await getIsLoggedIn() : false;`로 바꿨다. 환경 변수 가드는 그대로 유지한다.
- **영향 파일:** `app/page.tsx`
- **동작 변화:** 없음

### 8. 작은 코드 정리 — `품질`
- `components/update-password-form.tsx`: 제출 핸들러 이름이 `handleForgotPassword`로 잘못 붙어 있어 `handleUpdatePassword`로 바꿨다.
- `components/env-var-warning.tsx`: 상대 경로 `./ui/badge`를 `@/components/ui/badge`로 바꾸고, `variant={"outline"}`를 `variant="outline"`으로 고쳤다.
- `components/theme-switcher.tsx`: 화살표 함수와 `export { }` 형태를 가이드의 `export function`으로 바꿨다. 렌더할 때마다 선언되던 `ICON_SIZE`는 모듈 상수로 옮겼다. `className={"..."}`를 정리하고 `onValueChange={setTheme}`로 단순화했다.
- `components/user-avatar.tsx`: 파일 안에서만 쓰는 `getInitial`의 `export`를 제거했다(다른 사용처 없음, grep 확인).
- **동작 변화:** 없음

## 제안 (미적용)
| # | 제안 | 이유 | 적용 시 영향 | 우선순위 |
|---|---|---|---|---|
| 1 | `errorRedirect()`(`app/auth/callback/route.ts:7`, `app/auth/confirm/route.ts:8`)를 `lib/auth/`로 추출 | 아직 2곳뿐이다(3번째부터 추출하는 기준). 두 파일 모두 커밋되지 않은 진행 중 작업이라 건드리지 않았다 | 인증 Route Handler 2곳 | 낮음 |
| 2 | 비회원·404 화면 헤더 `<AppHeader minimal right={<ThemeSwitcher />} />`(`app/i/layout.tsx:20`, `app/s/layout.tsx:20`, `app/not-found.tsx:10`)를 `components/layout/`에 공통 컴포넌트로 추출 | 3번 반복되지만 놓을 위치인 `components/layout/`이 내 범위 밖이다 | 위 3개 파일과 `components/layout/` | 낮음 |
| 3 | 무효·만료 토큰 안내(`app/i/[token]/page.tsx:54-71`, `app/s/[token]/page.tsx:20-37`)를 "초대/정산" 라벨만 받는 공통 컴포넌트로 추출 | 2곳뿐이고 문구도 조금씩 다르다 | 토큰 페이지 2곳 | 낮음 |
| 4 | 회차 폼 검증과 변환(`app/actions/events.ts:55` `parseEventValues`, `app/actions/groups.ts:83` 인라인)을 `lib/actions/`의 공통 함수로 통합 | 2곳뿐이다. `"use server"` 파일은 동기 함수를 export할 수 없어서 새 파일로 옮겨야 한다 | 액션 2개 | 낮음 |
| 5 | 인증 폼 3곳의 이메일 입력 블록(`login-form`, `sign-up-form`, `forgot-password-form`) 공통화 | 인증 폼은 React Hook Form 전환(`docs/guides/forms-react-hook-form.md` "Supabase 인증 폼 전환 가이드")을 앞두고 있다. 전환할 때 함께 정리하는 편이 낫다 | 인증 폼 3개 | 낮음 |
| 6 | `ServerSupabaseClient` 타입이 `lib/actions/shared.ts:10`과 `lib/data/source.ts:10`에 중복 정의돼 있다. 한쪽에서 re-export하도록 통합 | `lib/data/`는 내 범위 밖이다 | 타입 import 경로 | 낮음 |
| 7 | 사용되지 않는 `profileSchema`, `ProfileFormValues`(`lib/schemas/profile.ts:32,36`) 정리 | 표시 이름 수정 기능용으로 미리 둔 것일 수 있다(확신 낮음). 계획을 확인한 뒤 삭제할지 정한다 | 없음 | 낮음 |

## ISSUES 후보
`ISSUES.md`의 "개별 이슈"에 추가할 항목(형식 그대로):

```
- [ ] (UI/UX) Google 로그인 시작 중 예외 시 버튼이 계속 비활성 — `signInWithOAuth`가 예외를 던지면(네트워크 등) `isLoading`이 풀리지 않고 처리되지 않은 rejection이 남는다. 위치: components/google-sign-in-button.tsx:21-30, 공통 처리 후보 아님
- [ ] (UI/UX) 로그아웃 버튼 진행·실패 표시 없음 — `signOut` 중 중복 클릭이 가능하고, 실패해도 그대로 로그인 화면으로 이동하며, 이동 후 `router.refresh()`가 없다. 위치: components/logout-button.tsx:10-14, 공통 처리 후보 아님
- [ ] (코드 정리) 테마 메뉴의 무효 Tailwind 클래스 — `w-content`는 Tailwind v4에 없는 유틸이라 적용되지 않는다(`w-fit` 등으로 교체하거나 삭제 검토, 화면 변화가 있을 수 있다). 위치: components/theme-switcher.tsx:63, 공통 처리 후보 아님
```

## check-all 범위 밖 사유
없음. `npm run check-all`이 프로젝트 전체에서 통과했다. 다른 에이전트가 수정 중인 `lib/data/source.ts`의 `getIsLoggedIn` 시그니처에 의존하는 변경(적용 7)이 하나 있다. 이 함수가 바뀌면 `app/page.tsx`를 다시 확인해야 한다.

## 변경 파일 목록
| 파일 | 변경 요약 |
|---|---|
| `app/auth/layout.tsx` | 인증 페이지 공통 가운데 정렬 래퍼 추가 |
| `app/auth/login/page.tsx` | 래퍼 제거 |
| `app/auth/sign-up/page.tsx` | 래퍼 제거 |
| `app/auth/forgot-password/page.tsx` | 래퍼 제거 |
| `app/auth/update-password/page.tsx` | 래퍼 제거 |
| `app/auth/sign-up-success/page.tsx` | 래퍼 제거 |
| `app/auth/error/page.tsx` | 래퍼 제거 |
| `app/page.tsx` | `getIsLoggedIn()` 사용, `createClient` import 제거 |
| `app/actions/events.ts` | 공통 문구, 마감 문구 상수 참조 |
| `app/actions/groups.ts` | 공통 문구 참조, `revalidateGroupListPaths` 추출 |
| `app/actions/invites.ts` | 회차 없음 문구 상수화 |
| `app/actions/members.ts` | 공통 문구 참조 |
| `app/actions/rsvps.ts` | 공통 문구 참조 |
| `app/actions/profile.ts` | 공통 타입·문구 import |
| `components/auth-form-error.tsx` | 신규: 인증 폼 오류 문구 컴포넌트 |
| `components/login-form.tsx` | `AuthFormError` 사용 |
| `components/sign-up-form.tsx` | `AuthFormError` 사용 |
| `components/forgot-password-form.tsx` | `AuthFormError` 사용 |
| `components/update-password-form.tsx` | `AuthFormError` 사용, 핸들러 이름 수정 |
| `components/env-var-warning.tsx` | import 별칭, prop 표기 정리 |
| `components/theme-switcher.tsx` | named function export, 상수 위치 정리 |
| `components/user-avatar.tsx` | 내부 함수 export 제거 |
| `lib/actions/shared.ts` | `MESSAGES`에 `groupNotFound`·`eventNotFound` 추가 |
| `lib/schemas/common.ts` | 신규: `personNameSchema`, `RSVP_DEADLINE_AFTER_START_MESSAGE` |
| `lib/schemas/member.ts` | `personNameSchema` 사용 |
| `lib/schemas/rsvp.ts` | `personNameSchema`, 마감 문구 상수 사용 |
| `lib/schemas/profile.ts` | `displayNameSchema`를 `personNameSchema` 별칭으로 |
| `lib/schemas/event.ts` | 마감 문구 상수 사용 |
