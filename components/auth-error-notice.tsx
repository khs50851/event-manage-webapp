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
    title: "ログインがキャンセルされました",
    description:
      "認証が中断されました。もう一度お試しいただくか、別の方法でログインしてください。",
  },
  failed: {
    icon: CircleAlert,
    title: "ログインできませんでした",
    description:
      "認証中に問題が発生しました。しばらくしてからもう一度お試しください。",
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
            <Link href="/auth/login">ログインに戻る</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">ホームへ</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
