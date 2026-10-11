# 컴포넌트 작성 패턴

이 프로젝트의 컴포넌트는 크게 두 계층으로 나뉩니다: `components/ui/`의 **shadcn 프리미티브**와 `components/`의 **조합(도메인) 컴포넌트**입니다.

## 계층 구조

```
components/
├── ui/              # 프리미티브: Button, Card, Input, Label, Badge, Checkbox, DropdownMenu
└── *.tsx            # 조합 컴포넌트: LoginForm, SignUpForm, Hero 등 (ui/ 컴포넌트를 조합)
```

- `components/ui/`는 스타일/접근성만 담당하는 저수준 컴포넌트다. 비즈니스 로직을 넣지 않는다.
- `components/` 최상위(또는 하위 도메인 폴더)는 상태 관리, API 호출, 라우팅 등 실제 기능을 구현한다.

## 1. UI 프리미티브 패턴 (`components/ui/`)

`components/ui/button.tsx`를 표준 템플릿으로 사용한다. 핵심 요소:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 1) cva로 스타일 variant 정의
const buttonVariants = cva("base-classes...", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});

// 2) Props는 HTML 속성 + VariantProps를 상속
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean; // Radix Slot을 통한 다형성(polymorphism) 지원
}

// 3) forwardRef로 ref 전달 지원
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button"; // devtools에서 컴포넌트 이름 표시

export { Button, buttonVariants };
```

규칙:

- **`forwardRef` 필수**: UI 프리미티브는 항상 DOM 요소에 `ref`를 전달할 수 있어야 한다.
- **`asChild` + `Slot` 패턴**: 컴포넌트를 다른 요소(예: `Link`)로 렌더링해야 할 때 Radix `Slot`을 사용한다.

```tsx
// Button을 Link로 렌더링 (실제 DOM은 <a>, 스타일은 Button 유지)
<Button asChild>
  <Link href="/events">이벤트 보기</Link>
</Button>
```

- **`className` 병합**: 항상 `cn(buttonVariants({...}), className)` 순서로 외부 `className`이 마지막에 적용되도록 한다.
- **`...props` 스프레드**: 명시한 props 외 나머지는 그대로 네이티브 요소에 전달한다.

## 2. 조합 컴포넌트 패턴 (`components/*.tsx`)

`components/login-form.tsx`처럼 여러 `ui/` 컴포넌트를 묶어 하나의 기능 단위를 만든다.

```tsx
"use client"; // 상태/이벤트 핸들러가 있으므로 클라이언트 컴포넌트

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function EventForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  // 상태, 핸들러 정의
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>{/* ui/ 컴포넌트 조합 */}</Card>
    </div>
  );
}
```

규칙:

- 최상위 wrapper는 `React.ComponentPropsWithoutRef<"div">`를 상속해 `className`과 나머지 HTML 속성을 그대로 받는다.
- 컴포넌트 이름은 `PascalCase`, named export를 사용한다 (`export function LoginForm`, default export 지양).
- 파일명은 `kebab-case.tsx`로 컴포넌트명과 대응시킨다 (`LoginForm` → `login-form.tsx`).

## 3. 서버 컴포넌트 vs 클라이언트 컴포넌트 선택 기준

| 조건 | 선택 |
|---|---|
| 데이터만 보여주고 상호작용 없음 | 서버 컴포넌트 (기본값, `"use client"` 생략) |
| `useState`/`useEffect`/이벤트 핸들러 필요 | 클라이언트 컴포넌트 (`"use client"` 선언) |
| Supabase 세션 확인, DB 조회 | 서버 컴포넌트 또는 Server Action |
| 폼 입력/제출 UI | 클라이언트 컴포넌트 ([[forms-react-hook-form]] 참고) |

**가능하면 `"use client"` 경계를 최대한 좁혀서(leaf 컴포넌트까지 내려서) 서버 컴포넌트 비중을 높인다.**

## 4. Props 타입 작성 규칙

- 인터페이스보다 **확장이 필요한 경우에만** `interface`를 사용하고, 단순한 경우 타입 별칭(`type`)을 사용해도 무방하다.
- HTML 요소를 감싸는 컴포넌트는 해당 요소의 속성을 상속한다.

```tsx
// 특정 HTML 요소의 속성을 그대로 상속
type CardProps = React.HTMLAttributes<HTMLDivElement>;

// ref까지 필요하면 ComponentPropsWithoutRef 사용
type InputProps = React.ComponentPropsWithoutRef<"input">;
```

## 5. 네이밍 & 파일 조직 요약

- 컴포넌트 파일 1개 = 컴포넌트 1개(+ 밀접하게 연관된 작은 서브 컴포넌트는 같은 파일에 둘 수 있음, 예: `Card`, `CardHeader`, `CardContent`를 `card.tsx`에 함께 export).
- 도메인이 커지면 `components/<도메인>/` 하위 폴더로 묶는다 (예: `components/groups/`).
- 자세한 폴더 배치 규칙은 [[project-structure]], 스타일 규칙은 [[styling-guide]]를 참고한다.
