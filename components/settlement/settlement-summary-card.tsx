import { BellRingIcon, CircleCheckIcon, ClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatYen } from "@/lib/format";
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
  const progressText = `${summary.paidCount}/${summary.targetCount}名 · ${summary.paidPercent}%`;
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
            1人あたりの金額
          </h2>
          <Badge variant={completed ? "default" : "secondary"}>
            <StatusIcon aria-hidden />
            {SETTLEMENT_STATUS_LABEL[completed ? "completed" : "in_progress"]}
          </Badge>
        </div>
        <p className="text-3xl font-bold tracking-tight wrap-break-word tabular-nums">
          {formatYen(summary.perPersonAmount)}
        </p>
        <p className="text-sm wrap-break-word">
          合計 {formatYen(summary.totalAmount)} · {summary.headCount}名
          {summary.hostIncluded && " (主催者含む)"}
        </p>
        {summary.hostRemainder > 0 && (
          <p className="text-sm text-muted-foreground">
            割り切れない{formatYen(summary.hostRemainder)}は主催者が負担します。
          </p>
        )}
        {/* 주최자 부담이 없으면(본인 미포함 + 나누어떨어짐) 0원 줄은 생략한다. */}
        {host && summary.hostBurden !== undefined && summary.hostBurden > 0 && (
          <p className="text-sm text-muted-foreground">
            主催者負担の合計 {formatYen(summary.hostBurden)}
            {hostShare > 0 &&
              summary.hostRemainder > 0 &&
              `  (本人分 ${formatYen(hostShare)} + 端数 ${formatYen(summary.hostRemainder)})`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">入金済み</span>
          <span className="font-semibold tabular-nums">{progressText}</span>
        </div>
        <Progress
          value={summary.paidPercent}
          aria-label="完納率"
          aria-valuetext={`${summary.targetCount}名中${summary.paidCount}名が入金済み、${summary.paidPercent}%`}
        />
        {completed ? (
          <p className="flex items-center gap-2 text-sm font-medium">
            <CircleCheckIcon className="size-4 shrink-0" aria-hidden />
            すべての対象の入金が確認されました。
          </p>
        ) : (
          host &&
          selfReportedCount > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-primary p-2 text-sm font-medium">
              <BellRingIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              入金したと報告した人が{selfReportedCount}
              名います。入金内容を確認してから、下の一覧で確定してください。
            </p>
          )
        )}
      </div>
    </section>
  );
}
