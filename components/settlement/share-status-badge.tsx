import { BellRingIcon, CircleCheckIcon, CircleDashedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SHARE_STATUS_LABEL } from "@/lib/settlement";
import type { ShareStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<
  ShareStatus,
  {
    variant: "default" | "secondary" | "outline";
    icon: typeof CircleCheckIcon;
    className?: string;
  }
> = {
  unpaid: { variant: "secondary", icon: CircleDashedIcon },
  // "확인 필요"는 주최자가 놓치지 않도록 테두리와 굵은 글씨로 강조한다(FR-12).
  self_reported: {
    variant: "outline",
    icon: BellRingIcon,
    className: "border-primary font-semibold",
  },
  paid: { variant: "default", icon: CircleCheckIcon },
};

// 입금 상태 배지. 색에만 의존하지 않도록 아이콘과 상태 텍스트를 함께 표시한다.
export function ShareStatusBadge({
  status,
  className,
}: {
  status: ShareStatus;
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  const Icon = style.icon;
  return (
    <Badge variant={style.variant} className={cn(style.className, className)}>
      <Icon aria-hidden />
      {SHARE_STATUS_LABEL[status]}
    </Badge>
  );
}
