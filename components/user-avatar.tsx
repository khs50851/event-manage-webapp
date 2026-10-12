import { cva, type VariantProps } from "class-variance-authority";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// 이름의 첫 글자(이모지 등 서로게이트 문자도 한 글자로 취급)
export function getInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "?";
}

// sm: 목록 행(36px), md: 프로필 카드(56px)
const userAvatarVariants = cva("shrink-0", {
  variants: {
    size: {
      sm: "size-9",
      md: "size-14",
    },
  },
  defaultVariants: { size: "sm" },
});

const fallbackVariants = cva(
  "bg-primary font-semibold text-primary-foreground",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-xl",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

type UserAvatarProps = {
  name: string;
  // 프로필 사진 URL(서명 URL). 없거나 로드에 실패하면 이니셜 원을 보여준다.
  avatarUrl?: string | null;
  className?: string;
} & VariantProps<typeof userAvatarVariants>;

// 사용자 아바타. 이름이 항상 바로 옆에 텍스트로 있으므로 장식 요소로 처리한다.
export function UserAvatar({
  name,
  avatarUrl,
  size,
  className,
}: UserAvatarProps) {
  return (
    <Avatar aria-hidden className={cn(userAvatarVariants({ size }), className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt="" className="object-cover" />
      )}
      <AvatarFallback className={fallbackVariants({ size })}>
        {getInitial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
