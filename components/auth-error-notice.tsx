import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircleAlert, CircleX } from "lucide-react";
import Link from "next/link";

export type AuthErrorKind = "cancelled" | "failed";

const NOTICE_CONTENT = {
  cancelled: {
    icon: CircleX,
    title: "로그인이 취소되었어요",
    description:
      "인증 과정이 중단되었어요. 다시 시도하거나 다른 방법으로 로그인해 주세요.",
  },
  failed: {
    icon: CircleAlert,
    title: "로그인하지 못했어요",
    description: "인증 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  },
} as const;

export function AuthErrorNotice({
  kind,
  className,
  ...props
}: { kind: AuthErrorKind } & React.ComponentPropsWithoutRef<"div">) {
  const { icon: Icon, title, description } = NOTICE_CONTENT[kind];

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <Icon
            aria-hidden="true"
            className={cn(
              "size-8",
              kind === "failed" ? "text-destructive" : "text-muted-foreground",
            )}
          />
          <CardTitle className="text-2xl">
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/login">로그인으로 돌아가기</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">홈으로</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
