"use client";

import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildSettlementSummaryText,
  type SettlementSummaryTextInput,
} from "@/lib/settlement";

// 재발급 후 이전 링크가 어떻게 보이는지 확인하는 더미 만료 토큰(연동 단계 I4에서 제거)
const EXPIRED_PREVIEW_PATH = "/s/settle-swim-3-old";

// 복사 완료 표시를 유지하는 시간
const COPIED_FEEDBACK_MS = 2000;

function subscribeNothing() {
  return () => {};
}

// 브라우저에서만 알 수 있는 값은 서버 스냅샷을 비워 두어 하이드레이션 불일치를 막는다.
function useOrigin() {
  return useSyncExternalStore(
    subscribeNothing,
    () => window.location.origin,
    () => "",
  );
}

type CopyTarget = "link" | "summary";

// 정산 링크 복사·재발급(U4-10)과 요약 문구 미리보기·복사(U4-9, FR-14).
// 초대 링크(InviteLinkCard)와 별개의 토큰을 쓰며, 재발급은 화면 상태로만 시뮬레이션한다.
export function SettlementLinkCard({
  initialToken,
  summaryText,
}: {
  initialToken: string | null;
  // 요약 문구 재료(링크 제외). 링크는 현재 토큰으로 이 컴포넌트가 채운다.
  summaryText: Omit<SettlementSummaryTextInput, "url">;
}) {
  const origin = useOrigin();
  const [token, setToken] = useState(initialToken);
  const [previousToken, setPreviousToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 방금 복사한 대상(버튼에 "복사했어요"를 잠시 보여준다)
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = token ? `${origin}/s/${token}` : "";
  const summary = buildSettlementSummaryText({ ...summaryText, url });

  async function copy(target: CopyTarget, text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      toast.success(message);
    } catch {
      toast.error("복사하지 못했어요. 내용을 길게 눌러 직접 복사해 주세요.");
    }
  }

  function confirmReissue() {
    // 실제 토큰은 서버에서 발급하는 128비트 이상 무작위 값. 여기서는 같은 길이로 흉내만 낸다.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const nextToken = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    setPreviousToken(token);
    setToken(nextToken);
    setCopied(null);
    setConfirming(false);
    toast.success("새 정산 링크를 발급했어요. 이전 링크는 이제 열리지 않아요.");
  }

  return (
    <section
      aria-labelledby="settlement-link-heading"
      className="flex flex-col gap-4 rounded-md border p-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="settlement-link-heading"
            className="flex items-center gap-2 font-semibold"
          >
            <ReceiptTextIcon className="size-4 shrink-0" aria-hidden />
            정산 링크
          </h2>
          <Badge variant="outline">초대 링크와 별개</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          참가자가 본인 금액과 입금 상태를 확인하는 링크예요. 참석 응답용 초대
          링크와 주소가 달라요.
        </p>
      </div>

      {token ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="settlement-link-url" className="sr-only">
              정산 링크 주소
            </label>
            <Input
              id="settlement-link-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-11 font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                className="min-h-11 flex-1"
                onClick={() => copy("link", url, "정산 링크를 복사했어요.")}
              >
                {copied === "link" ? (
                  <CheckIcon aria-hidden />
                ) : (
                  <CopyIcon aria-hidden />
                )}
                {copied === "link" ? "복사했어요" : "링크 복사"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirming(true)}
              >
                <RefreshCwIcon aria-hidden />
                재발급
              </Button>
            </div>
          </div>

          {previousToken && (
            <div
              role="status"
              className="flex flex-col gap-1 rounded-md bg-muted p-3 text-sm"
            >
              <p className="break-all">
                이전 링크(/s/{previousToken})는 만료됐어요. 그 링크로 들어오면
                &quot;만료된 링크&quot; 안내가 보여요.
              </p>
              <p className="text-xs text-muted-foreground">
                더미 화면이라 새 링크는 연동 단계에서 실제로 열려요.
              </p>
              <Link
                href={EXPIRED_PREVIEW_PATH}
                className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4"
              >
                만료 화면 미리보기
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileTextIcon className="size-4 shrink-0" aria-hidden />
              단체 대화방 안내 문구
            </h3>
            <p className="text-sm text-muted-foreground">
              금액, 입금 안내, 정산 링크가 함께 담겨요. 복사해서 메신저에 붙여
              넣으세요.
            </p>
            <pre
              aria-label="안내 문구 미리보기"
              tabIndex={0}
              className="max-h-60 overflow-y-auto rounded-md bg-muted p-3 font-sans text-sm wrap-break-word whitespace-pre-wrap"
            >
              {summary}
            </pre>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() =>
                copy("summary", summary, "안내 문구를 복사했어요.")
              }
            >
              {copied === "summary" ? (
                <CheckIcon aria-hidden />
              ) : (
                <CopyIcon aria-hidden />
              )}
              {copied === "summary" ? "복사했어요" : "안내 문구 복사"}
            </Button>
          </div>
          {/* 버튼 문구 변화를 스크린 리더에도 알린다. */}
          <p className="sr-only" aria-live="polite">
            {copied === "link" && "정산 링크를 복사했어요."}
            {copied === "summary" && "안내 문구를 복사했어요."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          정산 링크는 정산을 저장하면 발급돼요. (더미: 새로 만든 정산의 링크는
          연동 단계에서 실제로 열려요)
        </p>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정산 링크를 재발급할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지금 링크는 바로 만료되어 더 이상 열리지 않아요. 입금 상태는
              그대로 유지되고, 참가자에게는 새 링크를 다시 공유해야 해요. 초대
              링크에는 영향이 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">취소</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={confirmReissue}>
              재발급
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
