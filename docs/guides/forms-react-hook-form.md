# 폼 작성 가이드 (React Hook Form)

> **참고**: 현재 `package.json`에는 `react-hook-form`이 아직 설치되어 있지 않습니다. 기존 폼(`login-form.tsx`, `sign-up-form.tsx` 등)은 `useState` + `onSubmit` 수동 처리 방식으로 작성되어 있습니다. 이 문서는 **새로 작성하는 폼부터 적용할 표준 패턴**을 정의합니다.

## 설치

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn add form
```

- `react-hook-form`: 폼 상태/검증 관리
- `zod`: 스키마 기반 유효성 검증
- `@hookform/resolvers`: zod 스키마를 react-hook-form에 연결
- `shadcn add form`: `components/ui/form.tsx`를 생성 (Radix Label + Context 기반 Form 컴포넌트 세트)

## 기존 방식의 문제점 (useState 기반)

`components/login-form.tsx`의 현재 패턴:

```tsx
// 필드마다 useState를 따로 선언해야 하고, 검증 로직이 흩어지기 쉽다
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState<string | null>(null);
```

필드가 늘어날수록 `useState` 선언과 `onChange` 핸들러가 선형적으로 늘어나고, 필드 단위 에러 메시지·검증 규칙을 넣기 번거롭다. 새 폼은 아래 React Hook Form 패턴을 따른다.

## 표준 패턴: Zod 스키마 + `useForm` + shadcn `Form`

### 1) 스키마 정의

```tsx
// lib/schemas/event.ts
import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요."),
  startDate: z.string().min(1, "시작일을 선택해 주세요."),
  capacity: z.coerce.number().int().positive("정원은 1 이상이어야 합니다."),
});

export type EventFormValues = z.infer<typeof eventSchema>;
```

### 2) 폼 컴포넌트 작성

```tsx
// components/event-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, type EventFormValues } from "@/lib/schemas/event";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function EventForm() {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", startDate: "", capacity: 1 },
  });

  async function onSubmit(values: EventFormValues) {
    // 서버 액션 또는 API 호출
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이벤트 제목</FormLabel>
              <FormControl>
                <Input placeholder="예: 가을 컨퍼런스" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}
```

핵심 포인트:

- **`zodResolver`**로 zod 스키마를 그대로 검증 로직에 연결한다. 검증 규칙은 스키마 한 곳에만 정의한다.
- **`FormField` + `render`**: 필드 단위로 `field` 객체(`value`, `onChange`, `onBlur`, `ref`)를 받아 `ui/` 프리미티브에 스프레드한다.
- **`FormMessage`**: 해당 필드의 zod 에러 메시지를 자동으로 표시한다. 수동으로 에러 상태를 관리하지 않는다.
- **`form.formState.isSubmitting`**: 로딩 상태를 직접 `useState`로 관리하지 않고 react-hook-form이 제공하는 값을 사용한다.

## Server Action과 함께 사용하기

Next.js 16의 Server Action과 결합할 때는 `handleSubmit`의 콜백 안에서 액션을 호출한다.

```tsx
// app/actions/events.ts
"use server";

import { eventSchema } from "@/lib/schemas/event";

export async function createEvent(values: unknown) {
  const parsed = eventSchema.parse(values); // 서버에서도 동일 스키마로 재검증
  // Supabase insert 등 수행
}
```

```tsx
// 컴포넌트 쪽
import { createEvent } from "@/app/actions/events";

async function onSubmit(values: EventFormValues) {
  await createEvent(values);
}
```

**클라이언트 검증은 UX용, 서버 측 재검증은 보안/정합성용이다. 같은 zod 스키마를 양쪽에서 재사용해 중복 정의를 피한다.**

## Supabase 인증 폼 전환 가이드

`login-form.tsx`, `sign-up-form.tsx`, `update-password-form.tsx`를 리팩터링할 때는:

1. `lib/schemas/auth.ts`에 `loginSchema`, `signUpSchema` 등을 zod로 정의
2. `useForm({ resolver: zodResolver(schema) })`로 교체
3. 개별 `useState(email)`, `useState(password)` 제거 → `FormField`로 대체
4. Supabase 호출 실패 시 에러는 `form.setError("root", { message })`로 설정해 폼 레벨 에러로 표시

```tsx
try {
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) throw error;
  // 로그인 후에는 홈(/)으로 이동하고, 서버 컴포넌트의 세션 상태를 다시 읽는다
  router.push("/");
  router.refresh();
} catch (error) {
  form.setError("root", {
    message: error instanceof Error ? error.message : "오류가 발생했습니다.",
  });
}
```

```tsx
{form.formState.errors.root && (
  <p className="text-sm text-destructive">
    {form.formState.errors.root.message}
  </p>
)}
```

## 체크리스트

1. 검증 규칙은 zod 스키마 한 곳에만 정의하고 클라이언트/서버 양쪽에서 재사용
2. `useState`로 개별 필드를 관리하지 않고 `useForm` + `FormField` 사용
3. 로딩/제출 상태는 `form.formState.isSubmitting` 활용
4. 필드 에러는 `FormMessage`, 폼 전체 에러는 `form.formState.errors.root` 사용
5. shadcn `ui/` 프리미티브(`Input`, `Label` 등)는 그대로 재사용하고 `FormControl`로 감싼다
6. 컴포넌트 작성 기본 규칙은 [[component-patterns]], 스타일은 [[styling-guide]] 참고
