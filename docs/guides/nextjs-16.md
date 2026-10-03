# Next.js 16 가이드

이 프로젝트는 Next.js `16.3.8` (App Router + Turbopack)을 사용합니다. 이 문서는 Next.js 16에서 달라진 점과 이 프로젝트에서의 사용 패턴을 정리합니다.

## 핵심 변경 사항 (Next.js 15 → 16)

- **Turbopack이 기본 번들러**로 전환되었다 (`next dev`, `next build` 모두 Turbopack 사용). 별도 플래그 없이 기본 적용된다.
- **`cacheComponents` 설정**이 안정화되어 `next.config.ts`에서 사용 중이다 (과거 `dynamicIO` 실험 플래그의 후속 기능).
- 비동기 요청 API(`cookies()`, `headers()`, `params`, `searchParams`)가 **모두 Promise 기반**으로 완전히 전환되었다. 동기 접근은 더 이상 지원하지 않는다.
- React 19가 기본 전제이며, Server Actions / `useActionState` / `useFormStatus`가 1급 패턴으로 자리잡았다.

## `next.config.ts` 설정 설명

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // 컴포넌트 단위 캐싱(PPR 계열 기능)을 활성화
};

export default nextConfig;
```

`cacheComponents: true`를 켜면:

- 정적으로 캐시 가능한 부분과 동적인 부분을 컴포넌트 단위로 분리해 렌더링한다.
- 동적 데이터(요청별로 달라지는 값: `cookies()`, `headers()`, 요청 시점 `fetch` 등)를 사용하는 컴포넌트는 반드시 `<Suspense>`로 감싸야 빌드 에러 없이 동작한다.
- 정적으로 캐시해도 되는 데이터 호출부에는 `"use cache"` 지시어를 사용할 수 있다.

```tsx
// 동적 데이터를 쓰는 컴포넌트는 Suspense로 감싼다
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<p>불러오는 중...</p>}>
      <UserGreeting />
    </Suspense>
  );
}
```

```tsx
// 정적으로 캐시 가능한 함수에는 "use cache"를 선언한다
async function getEvents() {
  "use cache";
  const res = await fetch("https://api.example.com/events");
  return res.json();
}
```

## 비동기 요청 API (Async Request APIs)

Next.js 16에서는 `cookies()`, `headers()`, 동적 라우트의 `params`, `searchParams`가 모두 **Promise**를 반환한다. 이 프로젝트의 `lib/supabase/server.ts`가 대표 예시다.

```ts
// lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies(); // cookies()는 반드시 await
  // ...
}
```

라우트 세그먼트에서 `params`/`searchParams`를 받을 때도 동일하다.

```tsx
// app/events/[id]/page.tsx
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // 동기 구조분해 금지, 반드시 await
  return <div>이벤트 ID: {id}</div>;
}
```

## 서버 컴포넌트 vs 클라이언트 컴포넌트

- 기본값은 **서버 컴포넌트**다. 상태(`useState`), 이벤트 핸들러, 브라우저 전용 API가 필요할 때만 파일 최상단에 `"use client"`를 선언한다.
- 이 프로젝트의 `components/login-form.tsx`처럼 폼 상호작용이 필요한 컴포넌트는 클라이언트 컴포넌트로 분리하고, `app/auth/login/page.tsx` 같은 라우트는 서버 컴포넌트로 유지해 해당 클라이언트 컴포넌트를 렌더링한다.
- 데이터 조회(Supabase 세션 확인 등)는 가능한 한 서버 컴포넌트/서버 액션에서 수행하고, 클라이언트 컴포넌트에는 최소한의 상호작용 로직만 둔다.

## Server Actions 패턴

폼 제출이나 데이터 변경(mutation)은 Server Actions를 우선 고려한다.

```tsx
// app/actions/events.ts
"use server";

export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  // Supabase insert 등 서버 로직 수행
}
```

```tsx
// 클라이언트 컴포넌트에서 action으로 바로 연결
<form action={createEvent}>
  <input name="name" />
  <button type="submit">생성</button>
</form>
```

기존 `components/login-form.tsx`처럼 `onSubmit` + `useState`로 처리하는 방식도 동작하지만, 새 폼을 작성할 때는 [[forms-react-hook-form]] 가이드의 패턴(React Hook Form + Server Action)을 우선 검토한다.

## 라우팅 규칙 요약

- `app/<segment>/page.tsx`: 페이지
- `app/<segment>/layout.tsx`: 해당 세그먼트와 하위에 공통 적용되는 레이아웃
- `app/<segment>/route.ts`: API 라우트 핸들러 (예: `app/auth/confirm/route.ts`)
- `app/<segment>/error.tsx`: 에러 바운더리
- 인증이 필요한 라우트는 `app/protected/layout.tsx`처럼 레이아웃 단계에서 세션 검증을 수행한다

## 캐싱 모델 요약

| 대상 | 기본 동작 | 캐시를 원할 때 |
|---|---|---|
| `fetch()` (GET) | 요청별로 새로 수행 (Next 15+ 기본값) | `"use cache"` 또는 `fetch(url, { cache: "force-cache" })` |
| 동적 API (`cookies()`, `headers()`) | 항상 동적, 캐시 불가 | 해당 컴포넌트를 `<Suspense>`로 감싸 나머지는 정적으로 유지 |
| 서버 컴포넌트 전체 | `cacheComponents: true`에서는 동적 부분만 분리 렌더링 | 컴포넌트를 쪼개고 동적 부분만 `<Suspense>`로 격리 |

## 참고

- 린트: `npm run lint` (ESLint 9 flat config, `eslint-config-next`)
- 개발 서버: `npm run dev` (Turbopack 사용)
- 빌드: `npm run build`
