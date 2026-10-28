import { cn } from "@/lib/utils";

// 인증 폼 제출 실패 문구. 메시지가 없으면 아무것도 렌더링하지 않는다.
export function AuthFormError({
  message,
  className,
  ...props
}: { message: string | null } & Omit<
  React.ComponentPropsWithoutRef<"p">,
  "children"
>) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {message}
    </p>
  );
}
