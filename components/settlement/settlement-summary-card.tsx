import { BellRingIcon, CircleCheckIcon, ClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatWon } from "@/lib/format";
import {
  SETTLEMENT_STATUS_LABEL,
  type SettlementProgress,
  type SettlementSplit,
} from "@/lib/settlement";
import { cn } from "@/lib/utils";

// 요약 카드에 필요한 값. 주최자 화면은 SettlementSummary 전체를,
// 비회원 화면은 계산값 + 공개 집계(특정인 상태 없음)만 넘긴다.
export type SettlementSummaryCardData = Pick<
  SettlementSplit,
  | "totalAmount"
  | "headCount"
  | "hostIncluded"
  | "perPersonAmount"
  | "hostRemainder"
> &
  Pick<
    SettlementProgress,
    "targetCount" | "paidCount" | "paidPercent" | "isCompleted"
  > &
  Partial<Pick<SettlementSplit, "hostBurden">> &
  Partial<Pick<SettlementProgress, "selfReportedCount">>;

// 정산 금액·완납률 요약(주최자·비회원 공용, 상태 없음, U4-3, U4-5, U4-7).
// host: 주최자 화면에서만 주최자 실제 부담액과 "확인 필요" 인원을 보여준다.
export function SettlementSummaryCard({
  summary,
  host = false,
  className,
}: {
  summary: SettlementSummaryCardData;
  host?: boolean;
  className?: string;
}) {
  const completed = summary.isCompleted;
  const StatusIcon = completed ? CircleCheckIcon : ClockIcon;
  const progressText = `${summary.paidCount}/${summary.targetCount}명 · ${summary.paidPercent}%`;
  const selfReportedCount = summary.selfReportedCount ?? 0;
  // 주최자 본인 몫(포함 시 1인 금액)
  const hostShare = summary.hostIncluded ? summary.perPersonAmount : 0;

  return (
    <section
      aria-labelledby="settlement-summary-heading"
      className={cn(
        "flex flex-col gap-4 rounded-md border bg-card p-4",
        completed && "border-primary",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="settlement-summary-heading"
            className="text-sm text-muted-foreground"
          >
            1인 금액
          </h2>
          <Badge variant={completed ? "default" : "secondary"}>
            <StatusIcon aria-hidden />
            {SETTLEMENT_STATUS_LABEL[completed ? "completed" : "in_progress"]}
          </Badge>
        </div>
        <p className="text-3xl font-bold tracking-tight wrap-break-word tabular-nums">
          {formatWon(summary.perPersonAmount)}
        </p>
        <p className="text-sm wrap-break-word">
          총액 {formatWon(summary.totalAmount)} · {summary.headCount}명
          {summary.hostIncluded && " (주최자 포함)"}
        </p>
        {summary.hostRemainder > 0 && (
          <p className="text-sm text-muted-foreground">
            나누어떨어지지 않는 {formatWon(summary.hostRemainder)}은 주최자가
            부담해요.
          </p>
        )}
        {/* 주최자 부담이 없으면(본인 미포함 + 나누어떨어짐) 0원 줄은 생략한다. */}
        {host && summary.hostBurden !== undefined && summary.hostBurden > 0 && (
          <p className="text-sm text-muted-foreground">
            주최자 부담 합계 {formatWon(summary.hostBurden)}
            {hostShare > 0 &&
              summary.hostRemainder > 0 &&
              ` (본인 몫 ${formatWon(hostShare)} + 나머지 ${formatWon(summary.hostRemainder)})`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">입금 완료</span>
          <span className="font-semibold tabular-nums">{progressText}</span>
        </div>
        <Progress
          value={summary.paidPercent}
          aria-label="완납률"
          aria-valuetext={`${summary.targetCount}명 중 ${summary.paidCount}명 입금 완료, ${summary.paidPercent}%`}
        />
        {completed ? (
          <p className="flex items-center gap-2 text-sm font-medium">
            <CircleCheckIcon className="size-4 shrink-0" aria-hidden />
            모든 대상의 입금이 확인됐어요.
          </p>
        ) : (
          host &&
          selfReportedCount > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-primary p-2 text-sm font-medium">
              <BellRingIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              입금했다고 알린 사람이 {selfReportedCount}명 있어요. 입금 내역을
              확인한 뒤 아래 목록에서 확정해 주세요.
            </p>
          )
        )}
      </div>
    </section>
  );
}
