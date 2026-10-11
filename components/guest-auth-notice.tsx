import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

// 비회원 참가자용 선택 안내. 로그인은 필수가 아니므로 링크만 제공하고 리다이렉트하지 않는다.
export function GuestAuthNotice({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("w-full max-w-sm", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            로그인해서 참여하는 게 어떠세요?
          </CardTitle>
          <CardDescription>
            로그인하면 다른 기기에서도 내 응답을 확인하고 수정할 수 있어요.
            로그인하지 않아도 참석 응답은 그대로 할 수 있어요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/auth/login">로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">가입</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
