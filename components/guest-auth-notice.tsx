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
    title: "로그인해서 참여하는 게 어떠세요?",
    description:
      "로그인하면 다른 기기에서도 내 응답을 확인하고 수정할 수 있어요. 로그인하지 않아도 참석 응답은 그대로 할 수 있어요.",
  },
  settlement: {
    title: "정산을 모임에서 편하게 확인해 보세요",
    description:
      "로그인하면 참여한 모임의 정산 금액과 내 입금 현황을 한곳에서 볼 수 있어요. 로그인하지 않아도 이 링크로 입금 표시는 그대로 할 수 있어요.",
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
  // 정산 페이지는 모바일 터치 대상(44px)을 맞춘다. 기존 화면(홈·초대)의 버튼 크기는 유지한다.
  const buttonClassName = variant === "settlement" ? "min-h-11" : undefined;
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
            <Link href="/auth/login">로그인</Link>
          </Button>
          <Button asChild size="sm" className={buttonClassName}>
            <Link href="/auth/sign-up">가입</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
