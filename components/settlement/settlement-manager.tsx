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
import { formatWon, nowKstLocalString } from "@/lib/format";
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
    if (created && !token) setToken(createMockToken());
    toast.success(
      created ? "정산을 만들었어요." : "1인 금액을 다시 계산했어요.",
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
      toast.success("모든 대상의 입금이 확인돼 정산이 완료됐어요.");
    } else if (target) {
      // 항목이 다른 상태 그룹으로 옮겨 가므로 무엇이 바뀌었는지 알려 준다.
      const label = labelOfShare(target);
      toast.success(
        target.status === "paid"
          ? `${label} 님을 미입금으로 되돌렸어요.`
          : `${label} 님을 입금 완료로 표시했어요.`,
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
      selectedKeys={targetKeys}
      onChange={handleTargetsChange}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {event.status === "cancelled" && (
        <InviteNotice kind="cancelled" title="취소된 회차예요">
          취소 수수료처럼 나눠 낼 비용이 있을 때만 정산을 만들어 주세요.
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
            아직 정산이 없어요
          </h2>
          <p className="text-sm text-muted-foreground">
            {attendingCount > 0
              ? `총액을 입력하면 참석자 ${attendingCount}명 기준으로 1/N을 계산해요. 대상은 만들면서 바꿀 수 있어요.`
              : "아직 참석 응답이 없어요. 정산을 만들면서 대상을 직접 골라 주세요."}
          </p>
          <Button type="button" className="min-h-11 w-full" onClick={openForm}>
            정산 만들기
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
              {data ? "정산 수정" : "정산 만들기"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {data
                ? "총액이나 대상을 바꾸면 1인 금액을 다시 계산해요."
                : "총액과 대상을 정하면 1인 금액을 자동으로 계산해요."}
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
            submitLabel={data ? "다시 계산해 저장" : "정산 만들기"}
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
            총액·입금 안내 수정
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
              정산 대상 조정
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
              {adjustingTargets ? "접기" : "대상 추가·제외"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            지금 {data.settlement.headCount}명
            {data.settlement.hostIncluded && "(주최자 포함)"} · 1인{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatWon(data.settlement.perPersonAmount)}
            </span>
            . 체크를 바꾸면 1인 금액이 바로 다시 계산돼요.
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
                  {targetError} 저장된 정산은 바뀌지 않았어요.
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
        <AlertDialogTitle>입금을 마친 사람이 있어요</AlertDialogTitle>
        <AlertDialogDescription>
          {split.ok
            ? split.value.perPersonAmount === before
              ? `1인 금액은 ${formatWon(before)} 그대로예요.`
              : `1인 금액이 ${formatWon(before)}에서 ${formatWon(split.value.perPersonAmount)}으로 바뀌어요.`
            : "바꾼 내용으로는 정산을 계산할 수 없어요."}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {split.ok ? (
        <ul className="flex flex-col gap-2 text-sm">
          {keptPaid.length > 0 && split.value.perPersonAmount !== before && (
            <li className="rounded-md bg-muted p-3">
              이미 입금한 {keptPaid.length}명은{" "}
              {split.value.perPersonAmount > before
                ? `${formatWon(split.value.perPersonAmount - before)}을 더 받아야 해요.`
                : `${formatWon(before - split.value.perPersonAmount)}씩 돌려줘야 해요.`}
            </li>
          )}
          <li className="rounded-md bg-muted p-3">
            남는 대상의 입금 완료·확인 필요 상태는 그대로 유지돼요. 차액은 따로
            안내해 주세요.
          </li>
          {removedPaid.length > 0 && (
            <li className="rounded-md border border-destructive/50 p-3 text-destructive">
              {removedPaid.map(labelOfShare).join(", ")} 님은 이미 입금했는데
              대상에서 빠져요. 받은 금액은 따로 돌려주세요.
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
          {split.ok ? "취소" : "닫기"}
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
            다시 계산
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </>
  );
}

// 새 정산의 토큰 발급 흉내(실제는 서버에서 128비트 이상 무작위 값, I4-2)
function createMockToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
