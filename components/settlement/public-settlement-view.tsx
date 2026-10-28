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
import { formatYen, nowKstLocalString } from "@/lib/format";
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
  unpaid: "入金しました",
  self_reported: "主催者の確認待ちです",
  paid: "入金が確認されました",
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
    toast.success("入金を報告しました。主催者が確認すると完了します。");
  }

  async function copyGuide() {
    try {
      await navigator.clipboard.writeText(settlement.paymentGuide);
      setGuideCopied(true);
      toast.success("振込案内をコピーしました。");
    } catch {
      toast.error(
        "コピーできませんでした。内容を長押しして直接コピーしてください。",
      );
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
          振込案内
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
          {guideCopied ? "コピーしました" : "振込案内をコピー"}
        </Button>
      </section>

      <section
        aria-labelledby="my-share-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h2 id="my-share-heading" className="text-lg font-semibold">
            自分の入金状況
          </h2>
          <p className="text-sm text-muted-foreground">
            名前を選ぶと、自分の金額と入金状況だけが表示されます。他の人の入金状況は表示されません。
          </p>
        </div>
        <Select value={myShareId} onValueChange={selectShare}>
          <SelectTrigger
            className="min-h-11 w-full text-base"
            aria-label="自分の名前を選択"
          >
            <SelectValue placeholder="自分の名前を選択" />
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
            <span className="sr-only">自分の入金状況を読み込んでいます</span>
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
              自分の入金状況を読み込めませんでした。しばらくしてからもう一度お試しください。
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => loadMyShare(myShareId)}
            >
              <RotateCwIcon aria-hidden />
              再試行
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
                {mySelection.label}さん
              </p>
              <ShareStatusBadge status={myShare.status} />
            </div>
            <p className="text-2xl font-bold wrap-break-word tabular-nums">
              {formatYen(myShare.amount)}
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
                入金を済ませたらタップしてください。主催者に「要確認」として通知されます。
              </p>
            )}
            {myShare.status === "self_reported" && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                主催者が入金内容を確認するまでは「要確認」と表示されます。確認されると「入金済み」に変わります。
              </p>
            )}
          </div>
        )}
      </section>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>入金したことを報告しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              {mySelection?.label}さん {myShare && formatYen(myShare.amount)}{" "}
              の入金を主催者に報告します。主催者が確認するまでは「要確認」と表示されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={reportPaid}>
              入金しました
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
