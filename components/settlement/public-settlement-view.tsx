"use client";

import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  InfoIcon,
  RotateCwIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { getMySettlementShare } from "@/app/actions/settlements";
import { ShareStatusBadge } from "@/components/settlement/share-status-badge";
import { SettlementSummaryCard } from "@/components/settlement/settlement-summary-card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWon, nowKstLocalString } from "@/lib/format";
import { labelDuplicateNames } from "@/lib/rsvp";
import { markSelfReported } from "@/lib/settlement";
import type {
  PublicMySettlementShare,
  PublicSettlement,
  PublicSettlementProgress,
  PublicSettlementShare,
  ShareStatus,
} from "@/lib/types/domain";

// 본인 상태별 버튼 문구. "입금했어요"는 미입금일 때만 누를 수 있다(FR-12).
const MY_ACTION_LABEL: Record<ShareStatus, string> = {
  unpaid: "입금했어요",
  self_reported: "주최자 확인을 기다리고 있어요",
  paid: "입금이 확인됐어요",
};

// 비회원 정산 조회(U4-7, U4-8). 이름 선택 목록에는 id·이름만 있고,
// 이름을 고른 뒤에만 본인 금액·입금 상태를 보여준다. 타인의 입금 여부는 화면·DOM에 없다.
// 자가 표시는 "확인 필요"가 될 뿐 주최자 확정 전에는 입금 완료로 바뀌지 않는다(FR-12).
//
// 본인 항목은 이름을 고를 때마다 Server Action(getMySettlementShare)으로 서버에서 받아 온다.
// props에는 타인의 금액·상태가 없고, 응답도 고른 항목 하나뿐이다.
//
// 더미 단계 한계: "입금했어요"(자가 표시)는 저장하지 않고 화면 상태로만 시뮬레이션한다(저장은 연동 단계 I4).
// 서버는 항상 더미 원본 상태를 돌려주므로, 이 화면에서 자가 표시한 항목은 클라이언트 상태(myShares)를
// 우선해 같은 이름을 다시 골라도 "미입금"으로 되돌아가 보이지 않게 한다. 새로고침하면 원본 상태로 돌아간다.
export function PublicSettlementView({
  token,
  settlement,
  shares,
  progress,
}: {
  token: string;
  settlement: PublicSettlement;
  shares: PublicSettlementShare[];
  progress: PublicSettlementProgress;
}) {
  const [myShareId, setMyShareId] = useState("");
  // 이 화면에서 바뀐 본인 상태(자가 표시). 서버 응답보다 우선한다.
  const [myShares, setMyShares] = useState<
    Record<string, PublicMySettlementShare>
  >({});
  // 마지막으로 고른 항목의 서버 조회 결과
  const [loaded, setLoaded] = useState<PublicMySettlementShare | null>(null);
  // 조회에 실패한 항목 id(재시도 안내용)
  const [failedShareId, setFailedShareId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // 이름을 빠르게 바꿔 고를 때 마지막 선택의 응답만 반영하기 위한 요청 번호
  const requestIdRef = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [guideCopied, setGuideCopied] = useState(false);

  useEffect(() => {
    if (!guideCopied) return;
    const timer = setTimeout(() => setGuideCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [guideCopied]);

  const labeled = labelDuplicateNames(shares);
  const mySelection = labeled.find((share) => share.id === myShareId) ?? null;
  const myShare: PublicMySettlementShare | null = mySelection
    ? (myShares[mySelection.id] ??
      (loaded?.id === mySelection.id ? loaded : null))
    : null;
  const loadFailed = mySelection !== null && failedShareId === mySelection.id;
  const isLoading = mySelection !== null && !myShare && !loadFailed;

  function loadMyShare(shareId: string) {
    const requestId = ++requestIdRef.current;
    setFailedShareId(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof getMySettlementShare>>;
      try {
        result = await getMySettlementShare(token, shareId);
      } catch {
        result = { ok: false };
      }
      // 그사이 다른 이름을 골랐다면 이 응답은 버린다.
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        if (result.ok && result.share.id === shareId) {
          setLoaded(result.share);
        } else {
          setFailedShareId(shareId);
        }
      });
    });
  }

  function selectShare(shareId: string) {
    setMyShareId(shareId);
    // 이전 이름의 결과가 새 선택에 보이지 않도록 비운다.
    setLoaded(null);
    if (myShares[shareId]) {
      // 이 화면에서 자가 표시한 항목은 클라이언트 상태를 그대로 쓴다(진행 중인 조회는 무효화).
      requestIdRef.current += 1;
      setFailedShareId(null);
      return;
    }
    loadMyShare(shareId);
  }

  function reportPaid() {
    if (!myShare) return;
    setMyShares((current) => ({
      ...current,
      [myShare.id]: markSelfReported(myShare, nowKstLocalString()),
    }));
    setConfirming(false);
    toast.success("입금했다고 알렸어요. 주최자가 확인하면 완료돼요.");
  }

  async function copyGuide() {
    try {
      await navigator.clipboard.writeText(settlement.paymentGuide);
      setGuideCopied(true);
      toast.success("입금 안내를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 내용을 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettlementSummaryCard
        summary={{
          totalAmount: settlement.totalAmount,
          headCount: settlement.headCount,
          hostIncluded: settlement.hostIncluded,
          perPersonAmount: settlement.perPersonAmount,
          hostRemainder: settlement.hostRemainder,
          ...progress,
        }}
      />

      <section
        aria-labelledby="payment-guide-heading"
        className="flex flex-col gap-3 rounded-md border p-4"
      >
        <h2 id="payment-guide-heading" className="font-semibold">
          입금 안내
        </h2>
        <p className="wrap-break-word whitespace-pre-line">
          {settlement.paymentGuide}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={copyGuide}
        >
          {guideCopied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {guideCopied ? "복사했어요" : "입금 안내 복사"}
        </Button>
      </section>

      <section
        aria-labelledby="my-share-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="my-share-heading" className="text-lg font-semibold">
            내 입금 상태
          </h2>
          <p className="text-sm text-muted-foreground">
            이름을 고르면 내 금액과 입금 상태만 보여요. 다른 사람의 입금 여부는
            보이지 않아요.
          </p>
        </div>
        <Select value={myShareId} onValueChange={selectShare}>
          <SelectTrigger
            className="min-h-11 w-full text-base"
            aria-label="내 이름 선택"
          >
            <SelectValue placeholder="내 이름 선택" />
          </SelectTrigger>
          <SelectContent>
            {labeled.map((share) => (
              <SelectItem
                key={share.id}
                value={share.id}
                className="min-h-11 text-base"
              >
                {share.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <div
            role="status"
            aria-busy={isPending}
            className="flex flex-col gap-3 rounded-md border-2 border-primary p-4"
          >
            <span className="sr-only">내 입금 상태를 불러오고 있어요</span>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        )}

        {loadFailed && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-md border border-destructive p-4"
          >
            <p className="text-sm text-destructive">
              내 입금 상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => loadMyShare(myShareId)}
            >
              <RotateCwIcon aria-hidden />
              다시 시도
            </Button>
          </div>
        )}

        {mySelection && myShare && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col gap-3 rounded-md border-2 border-primary p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 font-semibold wrap-break-word">
                {mySelection.label} 님
              </p>
              <ShareStatusBadge status={myShare.status} />
            </div>
            <p className="text-2xl font-bold wrap-break-word tabular-nums">
              {formatWon(myShare.amount)}
            </p>
            <Button
              type="button"
              className="min-h-11"
              variant={myShare.status === "unpaid" ? "default" : "secondary"}
              disabled={myShare.status !== "unpaid"}
              onClick={() => setConfirming(true)}
            >
              {myShare.status === "self_reported" && <ClockIcon aria-hidden />}
              {myShare.status === "paid" && <CheckIcon aria-hidden />}
              {MY_ACTION_LABEL[myShare.status]}
            </Button>
            {myShare.status === "unpaid" && (
              <p className="text-sm text-muted-foreground">
                입금을 마쳤다면 눌러 주세요. 주최자에게 &quot;확인 필요&quot;로
                알려져요.
              </p>
            )}
            {myShare.status === "self_reported" && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                주최자가 입금 내역을 확인하기 전까지는 &quot;확인 필요&quot;로
                보여요. 확인되면 &quot;입금 완료&quot;로 바뀌어요.
              </p>
            )}
          </div>
        )}
      </section>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입금했다고 알릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {mySelection?.label} 님 {myShare && formatWon(myShare.amount)}{" "}
              입금을 주최자에게 알려요. 주최자가 확인하기 전까지는 &quot;확인
              필요&quot;로 보여요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">취소</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={reportPaid}>
              입금했어요
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
