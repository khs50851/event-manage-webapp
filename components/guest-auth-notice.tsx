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

// 화면별 안내 문구. rsvp: 홈·초대 페이지(기존 문구), settlement: 정산 조회 페이지
const COPY = {
  rsvp: {
    title: "ログインして参加しませんか?",
    description:
      "ログインすると、他の端末でも自分の回答を確認・編集できます。ログインしなくても出欠の回答はそのままできます。",
  },
  settlement: {
    title: "精算をグループで便利に確認しましょう",
    description:
      "ログインすると、参加中のグループの精算金額と自分の入金状況をまとめて確認できます。ログインしなくても、このリンクから入金の報告はそのままできます。",
  },
} as const;

// 비회원 참가자용 선택 안내. 로그인은 필수가 아니므로 링크만 제공하고 리다이렉트하지 않는다.
export function GuestAuthNotice({
  variant = "rsvp",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  variant?: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  // 모든 화면에서 모바일 터치 대상(44px)을 맞춘다(U5-3)
  const buttonClassName = "min-h-11";
  return (
    <div className={cn("w-full max-w-sm", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className={buttonClassName}
          >
            <Link href="/auth/login">ログイン</Link>
          </Button>
          <Button asChild size="sm" className={buttonClassName}>
            <Link href="/auth/sign-up">新規登録</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
