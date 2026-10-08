import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

// UI 단계: 모양과 배치만 구현한다. 실제 OAuth 연결은 로드맵 I2에서 추가한다.
export function GoogleSignInButton({
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Button>, "children">) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      {...props}
    >
      <GoogleIcon />
      Google로 계속하기
    </Button>
  );
}
