"use client";

import { PencilIcon, ReceiptTextIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InviteNotice } from "@/components/rsvp/invite-notice";
import {
  SettlementForm,
  type SettlementFormSubmit,
} from "@/components/settlement/settlement-form";
import { SettlementLinkCard } from "@/components/settlement/settlement-link-card";
import {
  SettlementShareList,
  type LabeledSettlementShare,
} from "@/components/settlement/settlement-share-list";
import { SettlementSummaryCard } from "@/components/settlement/settlement-summary-card";
import {
  labelCandidates,
  SettlementTargetPicker,
} from "@/components/settlement/settlement-target-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatYen, nowKstLocalString } from "@/lib/format";
import { createMockToken } from "@/lib/mock/token";
import {
  buildSettlement,
  calculateSplit,
  candidateKeyOfShare,
  defaultTargetKeys,
  needsChangeConfirmation,
  summarizeSettlement,
  targetKeysOfShares,
  toggleSharePaid,
  withDerivedStatus,
  type SettlementCandidate,
  type SettlementDraft,
} from "@/lib/settlement";
import type {
  EventStatus,
  GroupEvent,
  HostSettlementData,
  Settlement,
  SettlementShare,
} from "@/lib/types/domain";

// 정산 관리 화면에 필요한 회차 정보(요약 문구·안내용)
export type SettlementEventInfo = Pick<
  GroupEvent,
  "id" | "title" | "startsAt"
> & {
  status: EventStatus;
  groupName: string;
};

type SettlementState = { settlement: Settlement; shares: SettlementShare[] };

// 주최자 정산 관리 컨테이너(U4-3~U4-6, U4-8~U4-10).
// 생성·대상 변경·총액 수정·입금 토글은 모두 화면 상태로만 시뮬레이션하고 새로고침하면 초기화된다.
// 계산·검증·상태 전이는 lib/settlement.ts 순수 함수에 맡기고 이 컴포넌트는 상태만 연결한다.
export function SettlementManager({
  event,
  candidates,
  initial,
}: {
  event: SettlementEventInfo;
  candidates: SettlementCandidate[];
  initial: HostSettlementData;
}) {
  const [data, setData] = useState<SettlementState | null>(
    initial.settlement
      ? { settlement: initial.settlement, shares: initial.shares }
      : null,
  );
  const [token, setToken] = useState(initial.activeToken);
  // 대상 선택 상태. 정산이 있으면 기존 항목, 없으면 "참석" 응답자가 기본값(FR-08).
  const [targetKeys, setTargetKeys] = useState<string[]>(() =>
    initial.settlement
      ? targetKeysOfShares(initial.shares)
      : defaultTargetKeys(candidates),
  );
  // view: 정산 보기 / form: 생성·총액 수정 폼
  const [mode, setMode] = useState<"view" | "form">("view");
  // 보기 모드에서 대상 선택기를 펼쳤는지(실수로 대상을 바꾸지 않도록 기본은 접어 둔다)
  const [adjustingTargets, setAdjustingTargets] = useState(false);
  // 대상 변경으로 생긴 계산 오류(인라인 표시, PRD 7장)
  const [targetError, setTargetError] = useState<string | null>(null);
  // 입금 완료 항목이 있을 때 확인을 기다리는 변경(U4-6)
  const [pendingDraft, setPendingDraft] = useState<SettlementDraft | null>(
    null,
  );

  // 동명이인 라벨·메모는 후보 전체 기준으로 한 번 만들어 대상 선택기와 입금 현황이 함께 쓴다.
  const labels = labelCandidates(candidates);
  const attendingCount = defaultTargetKeys(candidates).length;

  // 성공하면 true. 확인 경고가 필요하면 보류하고 false.
  function applyDraft(draft: SettlementDraft, confirmed = false): boolean {
    if (!confirmed && needsChangeConfirmation(data, draft)) {
      setPendingDraft(draft);
      return false;
    }
    const result = buildSettlement({
      eventId: event.id,
      previous: data,
      candidates,
      draft,
      now: nowKstLocalString(),
    });
    if (!result.ok) {
      setTargetError(result.message);
      toast.error(result.message);
      return false;
    }
    const created = data === null;
    setData(result.value);
    setTargetKeys(draft.targetKeys);
    setTargetError(null);
    setMode("view");
    // 새 정산의 토큰 발급 흉내(실제는 서버에서 발급, I4-2)
    if (created && !token) setToken(createMockToken());
    toast.success(
      created ? "精算を作成しました。" : "1人あたりの金額を再計算しました。",
    );
    return true;
  }

  function handleFormSubmit(values: SettlementFormSubmit) {
    applyDraft({ ...values, targetKeys });
  }

  function handleTargetsChange(keys: string[]) {
    setTargetKeys(keys);
    // 보기 모드에서는 대상 변경 즉시 재계산한다(U4-4).
    // 폼 모드에서는 미리보기만 바뀌고 저장 버튼을 눌러야 반영된다.
    if (data && mode === "view") {
      applyDraft({
        totalAmount: data.settlement.totalAmount,
        hostIncluded: data.settlement.hostIncluded,
        paymentGuide: data.settlement.paymentGuide,
        targetKeys: keys,
      });
    }
  }

  function openForm() {
    setTargetError(null);
    setMode("form");
  }

  function cancelForm() {
    setMode("view");
    setTargetError(null);
    // 폼에서 바꾼 대상은 저장하지 않았으므로 저장된 상태로 되돌린다.
    if (data) setTargetKeys(targetKeysOfShares(data.shares));
  }

  function cancelPendingChange() {
    setPendingDraft(null);
    // 보기 모드에서 확인을 취소하면 대상 선택을 저장된 상태로 되돌린다.
    // 폼 모드는 입력을 이어서 고칠 수 있도록 그대로 둔다.
    if (data && mode === "view") setTargetKeys(targetKeysOfShares(data.shares));
  }

  function handleTogglePaid(shareId: string) {
    if (!data) return;
    const now = nowKstLocalString();
    const target = data.shares.find((share) => share.id === shareId);
    const shares = data.shares.map((share) =>
      share.id === shareId ? toggleSharePaid(share, now) : share,
    );
    const settlement = withDerivedStatus(data.settlement, shares, now);
    setData({ settlement, shares });
    if (
      settlement.status === "completed" &&
      data.settlement.status !== "completed"
    ) {
      toast.success("すべての対象の入金が確認され、精算が完了しました。");
    } else if (target) {
      // 항목이 다른 상태 그룹으로 옮겨 가므로 무엇이 바뀌었는지 알려 준다.
      const label = labelOfShare(target);
      toast.success(
        target.status === "paid"
          ? `${label}さんを未入金に戻しました。`
          : `${label}さんを入金済みにしました。`,
      );
    }
  }

  function labelOfShare(share: SettlementShare) {
    return labels.get(candidateKeyOfShare(share))?.label ?? share.name;
  }

  const summary = data
    ? summarizeSettlement(data.settlement, data.shares)
    : null;

  const labeledShares: LabeledSettlementShare[] = (data?.shares ?? []).map(
    (share) => {
      const label = labels.get(candidateKeyOfShare(share));
      return {
        ...share,
        label: label?.label ?? share.name,
        memo: label?.memo ?? "",
      };
    },
  );

  const picker = (
    <SettlementTargetPicker
      candidates={candidates}
      labels={labels}
      selectedKeys={targetKeys}
      onChange={handleTargetsChange}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {event.status === "cancelled" && (
        <InviteNotice kind="cancelled" title="中止された開催回です">
          キャンセル料のように割り勘する費用がある場合のみ、精算を作成してください。
        </InviteNotice>
      )}

      {/* 정산 없음 빈 상태(PRD 7장) */}
      {!data && mode === "view" && (
        <section
          aria-labelledby="settlement-empty-heading"
          className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center"
        >
          <ReceiptTextIcon
            className="size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 id="settlement-empty-heading" className="font-semibold">
            まだ精算がありません
          </h2>
          <p className="text-sm text-muted-foreground">
            {attendingCount > 0
              ? `合計金額を入力すると、参加者${attendingCount}名を基準に1/Nを計算します。対象は作成時に変更できます。`
              : "まだ参加の回答がありません。精算を作成する際に、対象を直接選んでください。"}
          </p>
          <Button type="button" className="min-h-11 w-full" onClick={openForm}>
            精算を作成
          </Button>
        </section>
      )}

      {mode === "form" && (
        <section
          aria-labelledby="settlement-form-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="settlement-form-heading" className="text-lg font-semibold">
              {data ? "精算を編集" : "精算を作成"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {data
                ? "合計金額や対象を変更すると、1人あたりの金額を再計算します。"
                : "合計金額と対象を決めると、1人あたりの金額を自動で計算します。"}
            </p>
          </div>
          <SettlementForm
            participantCount={targetKeys.length}
            defaultValues={
              data
                ? {
                    totalAmount: String(data.settlement.totalAmount),
                    paymentGuide: data.settlement.paymentGuide,
                    hostIncluded: data.settlement.hostIncluded,
                  }
                : undefined
            }
            submitLabel={data ? "再計算して保存" : "精算を作成"}
            onSubmit={handleFormSubmit}
            onCancel={cancelForm}
            targetPicker={picker}
          />
        </section>
      )}

      {data && mode === "view" && summary?.ok && (
        <div className="flex flex-col gap-2">
          <SettlementSummaryCard summary={summary.value} host />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={openForm}
          >
            <PencilIcon aria-hidden />
            合計金額・振込案内を編集
          </Button>
        </div>
      )}

      {data && mode === "view" && (
        <SettlementShareList
          shares={labeledShares}
          onTogglePaid={handleTogglePaid}
        />
      )}

      {data && mode === "view" && (
        <section
          aria-labelledby="target-adjust-heading"
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="target-adjust-heading" className="font-semibold">
              精算対象の調整
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0"
              aria-expanded={adjustingTargets}
              aria-controls="target-adjust-panel"
              onClick={() => setAdjustingTargets((open) => !open)}
            >
              {adjustingTargets ? "閉じる" : "対象を追加・除外"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            現在 {data.settlement.headCount}名
            {data.settlement.hostIncluded && "(主催者含む)"} · 1人あたり{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatYen(data.settlement.perPersonAmount)}
            </span>
            。チェックを変更すると、1人あたりの金額がすぐに再計算されます。
          </p>
          {adjustingTargets && (
            <div id="target-adjust-panel" className="flex flex-col gap-2">
              {picker}
              {targetError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 text-sm font-medium text-destructive"
                >
                  <TriangleAlertIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  {targetError} 保存された精算は変更されていません。
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {data && mode === "view" && (
        <SettlementLinkCard
          // 새 정산으로 토큰이 생기면 카드 상태를 초기화한다.
          key={token ?? "none"}
          initialToken={token}
          summaryText={{
            groupName: event.groupName,
            eventTitle: event.title,
            startsAt: event.startsAt,
            totalAmount: data.settlement.totalAmount,
            headCount: data.settlement.headCount,
            hostIncluded: data.settlement.hostIncluded,
            perPersonAmount: data.settlement.perPersonAmount,
            paymentGuide: data.settlement.paymentGuide,
          }}
        />
      )}

      <AlertDialog
        open={pendingDraft !== null}
        onOpenChange={(open) => {
          if (!open) cancelPendingChange();
        }}
      >
        <AlertDialogContent>
          {pendingDraft && data && (
            <ChangeWarning
              previous={data}
              draft={pendingDraft}
              labelOfShare={labelOfShare}
              onConfirm={() => {
                applyDraft(pendingDraft, true);
                setPendingDraft(null);
              }}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 입금 완료 항목이 있을 때 총액·대상 변경 확인 경고(U4-6).
// 변경 전후 1인 금액과 차액, 상태 유지, 대상에서 빠지는 입금자를 안내한다.
function ChangeWarning({
  previous,
  draft,
  labelOfShare,
  onConfirm,
}: {
  previous: SettlementState;
  draft: SettlementDraft;
  labelOfShare: (share: SettlementShare) => string;
  onConfirm: () => void;
}) {
  const nextKeys = new Set(draft.targetKeys);
  const split = calculateSplit({
    totalAmount: draft.totalAmount,
    participantCount: nextKeys.size,
    hostIncluded: draft.hostIncluded,
  });
  const before = previous.settlement.perPersonAmount;
  const paidShares = previous.shares.filter((share) => share.status === "paid");
  const keptPaid = paidShares.filter((share) =>
    nextKeys.has(candidateKeyOfShare(share)),
  );
  const removedPaid = paidShares.filter(
    (share) => !nextKeys.has(candidateKeyOfShare(share)),
  );

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>入金済みの人がいます</AlertDialogTitle>
        <AlertDialogDescription>
          {split.ok
            ? split.value.perPersonAmount === before
              ? `1人あたりの金額は${formatYen(before)}のままです。`
              : `1人あたりの金額が${formatYen(before)}から${formatYen(split.value.perPersonAmount)}に変わります。`
            : "変更した内容では精算を計算できません。"}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {split.ok ? (
        <ul className="flex flex-col gap-2 text-sm">
          {keptPaid.length > 0 && split.value.perPersonAmount !== before && (
            <li className="rounded-md bg-muted p-3">
              すでに入金済みの{keptPaid.length}名は{" "}
              {split.value.perPersonAmount > before
                ? `${formatYen(split.value.perPersonAmount - before)}を追加で受け取る必要があります。`
                : `${formatYen(before - split.value.perPersonAmount)}ずつ返金する必要があります。`}
            </li>
          )}
          <li className="rounded-md bg-muted p-3">
            残る対象の「入金済み」「要確認」の状態はそのまま保持されます。差額は別途ご案内ください。
          </li>
          {removedPaid.length > 0 && (
            <li className="rounded-md border border-destructive/50 p-3 text-destructive">
              {removedPaid.map(labelOfShare).join(", ")}
              さんはすでに入金済みですが、対象から外れます。受け取った金額は別途返金してください。
            </li>
          )}
        </ul>
      ) : (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm font-medium text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {split.message}
        </p>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel className="min-h-11">
          {split.ok ? "キャンセル" : "閉じる"}
        </AlertDialogCancel>
        {split.ok && (
          <AlertDialogAction
            className="min-h-11"
            onClick={(clickEvent) => {
              // 자동 닫힘(onOpenChange → 취소 처리)으로 대상 선택이 되돌아가지 않도록 직접 닫는다.
              clickEvent.preventDefault();
              onConfirm();
            }}
          >
            再計算
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </>
  );
}
