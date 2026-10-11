import {
  CircleSlashIcon,
  ClockIcon,
  LinkIcon,
  XCircleIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  invalid: LinkIcon,
  expired: ClockIcon,
  cancelled: XCircleIcon,
  closed: CircleSlashIcon,
};

// 초대 페이지의 상태 안내(무효·만료·취소·마감). 아이콘과 함께 항상 텍스트 제목을 표시한다.
export function InviteNotice({
  kind,
  title,
  children,
  className,
}: {
  kind: keyof typeof ICONS;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-md border p-4",
        kind === "cancelled" && "border-destructive/50",
        className,
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 font-semibold",
          kind === "cancelled" && "text-destructive",
        )}
      >
        <Icon className="size-5 shrink-0" />
        {title}
      </p>
      {children && (
        <div className="text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
