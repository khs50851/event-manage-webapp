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
import { createMockToken } from "@/lib/mock/token";
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
      toast.error(
        "コピーできませんでした。内容を長押しして直接コピーしてください。",
      );
    }
  }

  function confirmReissue() {
    // 실제 토큰은 서버에서 발급한다. 여기서는 같은 길이의 무작위 값으로 흉내만 낸다.
    setPreviousToken(token);
    setToken(createMockToken());
    setCopied(null);
    setConfirming(false);
    toast.success(
      "新しい精算リンクを発行しました。以前のリンクは開けなくなります。",
    );
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
            精算リンク
          </h2>
          <Badge variant="outline">招待リンクとは別</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          参加者が自分の金額と入金状況を確認するリンクです。出欠回答用の招待リンクとはアドレスが異なります。
        </p>
      </div>

      {token ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="settlement-link-url" className="sr-only">
              精算リンクのアドレス
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
                onClick={() =>
                  copy("link", url, "精算リンクをコピーしました。")
                }
              >
                {copied === "link" ? (
                  <CheckIcon aria-hidden />
                ) : (
                  <CopyIcon aria-hidden />
                )}
                {copied === "link" ? "コピーしました" : "リンクをコピー"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirming(true)}
              >
                <RefreshCwIcon aria-hidden />
                再発行
              </Button>
            </div>
          </div>

          {previousToken && (
            <div
              role="status"
              className="flex flex-col gap-1 rounded-md bg-muted p-3 text-sm"
            >
              <p className="break-all">
                以前のリンク(/s/{previousToken}
                )は無効になりました。そのリンクでアクセスすると「有効期限切れのリンク」と表示されます。
              </p>
              <p className="text-xs text-muted-foreground">
                ダミー画面のため、新しいリンクは連携段階で実際に開けるようになります。
              </p>
              <Link
                href={EXPIRED_PREVIEW_PATH}
                className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4"
              >
                期限切れ画面のプレビュー
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileTextIcon className="size-4 shrink-0" aria-hidden />
              グループチャット用の案内文
            </h3>
            <p className="text-sm text-muted-foreground">
              金額、振込案内、精算リンクがまとめて入っています。コピーしてメッセンジャーに貼り付けてください。
            </p>
            <pre
              aria-label="案内文のプレビュー"
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
                copy("summary", summary, "案内文をコピーしました。")
              }
            >
              {copied === "summary" ? (
                <CheckIcon aria-hidden />
              ) : (
                <CopyIcon aria-hidden />
              )}
              {copied === "summary" ? "コピーしました" : "案内文をコピー"}
            </Button>
          </div>
          {/* 버튼 문구 변화를 스크린 리더에도 알린다. */}
          <p className="sr-only" aria-live="polite">
            {copied === "link" && "精算リンクをコピーしました。"}
            {copied === "summary" && "案内文をコピーしました。"}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          精算リンクは精算を保存すると発行されます。(ダミー:新しく作った精算のリンクは連携段階で実際に開けるようになります)
        </p>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>精算リンクを再発行しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              現在のリンクはすぐに無効になり、開けなくなります。入金状況はそのまま保持されますが、参加者には新しいリンクを再度共有する必要があります。招待リンクには影響しません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={confirmReissue}>
              再発行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
