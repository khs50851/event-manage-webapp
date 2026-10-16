import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EVENT_DISPLAY_LABEL, type EventDisplayStatus } from "@/lib/rsvp";

// 회차 표시 상태 배지. 예정은 강조색, 응답마감·마감은 회색, 취소됨은 짙은 노란색(warning 토큰)이다.
export function EventStatusBadge({ status }: { status: EventDisplayStatus }) {
  return (
    <Badge
      variant={status === "scheduled" ? "default" : "secondary"}
      className={cn(
        (status === "rsvp-closed" || status === "closed") &&
          "bg-muted text-muted-foreground",
        // 라이트는 어두운 앰버(흰 글씨), 다크는 밝은 노랑(검정 글씨)으로 대비를 확보한다
        status === "cancelled" && "bg-warning text-white dark:text-black",
      )}
    >
      {EVENT_DISPLAY_LABEL[status]}
    </Badge>
  );
}
