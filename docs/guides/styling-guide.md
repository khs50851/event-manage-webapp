# 스타일링 가이드 (Tailwind CSS + shadcn/ui)

이 프로젝트는 **Tailwind CSS v4**와 **shadcn/ui**(`new-york` 스타일, `neutral` 베이스 컬러)를 사용합니다.

## 설정 개요

### `components.json` (shadcn/ui 설정)

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  }
}
```

- 모든 새 shadcn 컴포넌트는 `npx shadcn add <component>` 명령으로 추가한다. 수동 복붙보다 CLI 사용을 우선한다.
- `cssVariables: true`이므로 색상은 하드코딩된 Tailwind 색상(`bg-blue-500` 등)이 아니라 **CSS 변수 기반 디자인 토큰**(`bg-primary`, `bg-background` 등)을 사용한다.

### 디자인 토큰 (`app/globals.css`)

라이트/다크 테마 값은 `:root`와 `.dark`에 OKLCH 변수로 정의되어 있고, shadcn/ui 기본 neutral 테마를 그대로 사용한다.

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
  /* ... */
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

Tailwind v4는 `tailwind.config` 파일 없이 CSS 안의 `@theme inline`으로 변수를 색상 유틸에 연결한다.

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... */
}
```

**새로운 색상이 필요하면 Tailwind 클래스에 직접 색을 넣지 말고, `globals.css`의 `:root`/`.dark`에 CSS 변수를 추가한 뒤 `@theme inline`에 `--color-*`로 매핑한다.**

## 다크모드

- `@custom-variant dark (&:is(.dark *));`(globals.css) + `next-themes`의 `ThemeProvider`(`attribute="class"`)를 `app/layout.tsx`에서 사용한다.
- 다크모드 분기 처리가 필요하면 `dark:` 접두사를 사용한다. 토큰 기반 색상(`bg-background`, `text-foreground`)을 쓰면 대부분 `dark:` 없이 자동으로 전환된다.

```tsx
// 토큰 기반 색상은 다크모드를 자동으로 따라간다
<div className="bg-background text-foreground">...</div>

// 토큰에 없는 예외적인 경우에만 dark: 접두사 사용
<div className="bg-white dark:bg-neutral-900">...</div>
```

- 테마 전환 UI는 `components/theme-switcher.tsx`를 참고한다.

## `cn()` 유틸리티

클래스명 병합에는 반드시 `lib/utils.ts`의 `cn()`을 사용한다 (`clsx` + `tailwind-merge` 조합으로 충돌하는 Tailwind 클래스를 올바르게 덮어쓴다).

```tsx
import { cn } from "@/lib/utils";

<div className={cn("flex flex-col gap-6", className)} />
```

- 조건부 클래스: `cn("base-class", isActive && "bg-primary")`
- 외부에서 받은 `className` prop은 항상 마지막 인자로 넘겨 우선순위를 보장한다.

## Variant 관리: `class-variance-authority` (cva)

버튼처럼 여러 스타일 변형이 필요한 컴포넌트는 `cva`로 variant를 정의한다 (`components/ui/button.tsx` 참고).

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

새 UI 컴포넌트에 여러 스타일 조합이 필요하면 이 패턴을 그대로 따른다. 자세한 컴포넌트 작성 규칙은 [[component-patterns]]를 참고한다.

## 반응형 & 레이아웃 규칙

- 모바일 우선(mobile-first)으로 작성하고, `sm:`, `md:`, `lg:` 접두사로 확장한다.
- 레이아웃은 Flexbox(`flex flex-col gap-*`)를 기본으로 사용하고, 그리드가 필요한 카드 목록 등에는 `grid grid-cols-*`를 사용한다.
- 간격은 Tailwind의 `gap-*` 유틸을 우선 사용하고, 개별 `margin`(`mt-*`, `mb-*`)은 형제 요소 간 특수한 간격 조정이 필요할 때만 사용한다.

## 아이콘

- `lucide-react`를 사용한다. 버튼 안에 아이콘을 넣을 때는 shadcn 버튼의 기본 스타일(`[&_svg]:size-4 [&_svg]:shrink-0`)이 자동으로 크기를 맞춰준다.

```tsx
import { Loader2 } from "lucide-react";

<Button disabled>
  <Loader2 className="animate-spin" />
  처리 중...
</Button>
```

## 체크리스트

1. 색상은 하드코딩 대신 디자인 토큰(`bg-background`, `text-foreground`, `border-input` 등) 사용
2. 클래스 병합은 항상 `cn()` 사용
3. 변형이 여러 개인 컴포넌트는 `cva`로 정의
4. 새 shadcn 컴포넌트는 CLI로 추가 (`npx shadcn add <component>`)
5. 다크모드는 토큰 기반으로 자동 대응, 예외적인 경우만 `dark:` 명시

## 모바일 퍼스트 셸

앱 전체는 데스크톱에서도 중앙 480px 단일 컬럼으로 보인다(좌우는 `bg-muted` 여백, 컬럼에 `shadow-xl`).

- `components/layout/mobile-shell.tsx` — 컬럼 프레임. `header`(헤더 슬롯)와 `tabBar`(하단 탭바 표시) props를 받는다. 탭바가 있으면 콘텐츠에 하단 패딩(`pb-[calc(env(safe-area-inset-bottom)+6rem)]`)을 준다.
- `components/layout/app-header.tsx` — 상단 헤더(좌측 로고, 우측 `right` 슬롯). `minimal`이면 인증/초대 화면용 낮은 헤더.
- `components/layout/bottom-tab-bar.tsx` — 하단 플로팅 탭바(`usePathname`으로 활성 탭 판별하는 client component). 실제 존재하는 라우트만 탭으로 둔다(홈 `/protected`, 새 모임 `/protected/groups/new`, 내 정보 `/protected/me`). `cacheComponents` 때문에 `MobileShell`이 `<Suspense>`로 감싼다.
- 적용: `app/page.tsx`(헤더만), `app/auth/layout.tsx`·`app/i/layout.tsx`(최소 헤더, 탭바 없음), `app/protected/layout.tsx`(헤더 + 탭바).
- 터치 영역은 최소 44px(`min-h-11`), 페이지 콘텐츠는 `w-full`로 컬럼 폭을 따른다. 테마 전환은 헤더 우측에 둔다.
