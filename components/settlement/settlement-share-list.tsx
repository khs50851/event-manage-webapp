"use client";

import { BellRingIcon } from "lucide-react";

import { ShareStatusBadge } from "@/components/settlement/share-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatWon } from "@/lib/format";
import { SHARE_STATUS_LABEL } from "@/lib/settlement";
import type { SettlementShare, ShareStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

// 화면 표시용 라벨(동명이인 순번)과 주최자 전용 연락처 메모를 붙인 정산 항목
export type LabeledSettlementShare = SettlementShare & {
  label: string;
  memo: string;
};

// 주최자가 먼저 처리해야 하는 순서: 확인 필요 → 미입금 → 입금 완료
const GROUP_ORDER: ShareStatus[] = ["self_reported", "unpaid", "paid"];

// 상태별 확정 버튼 문구와 스타일
const ACTION: Record<
  ShareStatus,
  {
    text: string;
    ariaSuffix: string;
    variant: "default" | "outline" | "ghost";
  }
> = {
  self_reported: {
    text: "입금 확정",
    ariaSuffix: "입금 완료로 확정",
    variant: "default",
  },
  unpaid: {
    text: "입금 확인",
    ariaSuffix: "입금 완료로 표시",
    variant: "outline",
  },
  paid: {
    text: "되돌리기",
    ariaSuffix: "미입금으로 되돌리기",
    variant: "ghost",
  },
};

// 주최자 입금 상태 관리(U4-5, U4-8). 항목별 미입금 ↔ 입금 완료 토글,
// 참가자 자가 입금 표시는 "확인 필요" 그룹으로 맨 위에 모아 확정 흐름을 분명히 한다.
// 상태는 부모가 소유한다.
export function SettlementShareList({
  shares,
  onTogglePaid,
}: {
  shares: LabeledSettlementShare[];
  onTogglePaid: (shareId: string) => void;
}) {
  const groups = GROUP_ORDER.map((status) => ({
    status,
    items: shares.filter((share) => share.status === status),
  })).filter((group) => group.items.length > 0);

  return (
    <section
      aria-labelledby="settlement-shares-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="settlement-shares-heading" className="text-lg font-semibold">
          입금 현황
        </h2>
        <span className="text-sm text-muted-foreground">
          대상 {shares.length}명
        </span>
      </div>

      {groups.map((group) => {
        const emphasized = group.status === "self_reported";
        const headingId = `settlement-group-${group.status}`;
        return (
          <div
            key={group.status}
            className={cn(
              "rounded-md border",
              emphasized && "border-2 border-primary",
            )}
          >
            <div className="flex flex-col gap-1 border-b px-3 py-2">
              <h3
                id={headingId}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                {emphasized && (
                  <BellRingIcon className="size-4 shrink-0" aria-hidden />
                )}
                {SHARE_STATUS_LABEL[group.status]} ({group.items.length})
              </h3>
              {emphasized && (
                <p className="text-xs text-muted-foreground">
                  참가자가 입금했다고 알렸어요. 입금 내역을 확인한 뒤 확정해
                  주세요. 확정 전에는 입금 완료로 세지 않아요.
                </p>
              )}
            </div>
            <ul className="divide-y" aria-labelledby={headingId}>
              {group.items.map((share) => {
                const action = ACTION[share.status];
                return (
                  <li
                    key={share.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium wrap-break-word">
                        {share.label}
                        {share.memo && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {share.memo}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <ShareStatusBadge status={share.status} />
                        <span className="tabular-nums">
                          {formatWon(share.amount)}
                        </span>
                        {share.statusChangedAt && (
                          <span>{formatDateTime(share.statusChangedAt)}</span>
                        )}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={action.variant}
                      className="min-h-11 shrink-0"
                      aria-label={`${share.label} ${action.ariaSuffix}`}
                      onClick={() => onTogglePaid(share.id)}
                    >
                      {action.text}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
