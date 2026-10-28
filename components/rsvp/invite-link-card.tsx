"use client";

import { CopyIcon, RefreshCwIcon, Share2Icon } from "lucide-react";
import { type MouseEvent, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { rotateInviteToken } from "@/app/actions/invites";
import {
  isDevPreviewFallback,
  reportActionException,
} from "@/components/groups/action-feedback";
import { ConfirmActionDialog } from "@/components/groups/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventStatus } from "@/lib/types/domain";

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

function useCanShare() {
  return useSyncExternalStore(
    subscribeNothing,
    () => typeof navigator.share === "function",
    () => false,
  );
}

// 주최자용 초대 링크 복사·공유·재발급(FR-05). 재발급은 rotateInviteToken Server Action으로 하며,
// 새 토큰은 액션 반환값으로 화면에 반영한다(useState 초기값은 재검증 재렌더에 반응하지 않는다).
// 비로그인 개발 미리보기에서만 화면 상태로 시뮬레이션한다(isDevPreviewFallback).
export function InviteLinkCard({
  eventId,
  eventTitle,
  eventStatus,
  initialToken,
}: {
  eventId: string;
  eventTitle: string;
  eventStatus: EventStatus;
  initialToken: string | null;
}) {
  const origin = useOrigin();
  const canShare = useCanShare();
  const [token, setToken] = useState(initialToken);
  const [rotated, setRotated] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const path = token ? `/i/${token}` : "";
  const url = `${origin}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("招待リンクをコピーしました。");
    } catch {
      toast.error(
        "コピーできませんでした。リンクを直接選択してコピーしてください。",
      );
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: eventTitle, url });
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우는 오류로 안내하지 않는다.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("共有できませんでした。リンクのコピーをご利用ください。");
    }
  }

  function applyNewToken(nextToken: string) {
    setToken(nextToken);
    setRotated(true);
    setConfirming(false);
    toast.success(
      "新しい招待リンクを発行しました。以前のリンクは無効になります。",
    );
  }

  // 비로그인 개발 미리보기 폴백: 같은 길이의 무작위 값으로 흉내만 낸다(실제 토큰은 서버가 발급).
  function simulateReissue() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    applyNewToken(
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    );
  }

  async function confirmReissue(event: MouseEvent<HTMLButtonElement>) {
    // 발급이 끝날 때까지 대화상자를 열어 두고(실패 시 바로 재시도), 성공하면 닫는다.
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await rotateInviteToken(eventId);
      if (result.ok) {
        applyNewToken(result.data.token);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateReissue();
        return;
      }
      toast.error(result.message);
    } catch (error) {
      reportActionException(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="invite-link-heading"
      className="flex flex-col gap-3 rounded-md border p-4"
    >
      <h2 id="invite-link-heading" className="font-semibold">
        招待リンク
      </h2>
      {eventStatus === "cancelled" && (
        <p className="text-sm text-muted-foreground">
          中止された開催回です。リンクからアクセスした参加者には中止のお知らせが表示されます。
        </p>
      )}

      {token ? (
        <>
          <label htmlFor="invite-link-url" className="sr-only">
            招待リンクのアドレス
          </label>
          <Input
            id="invite-link-url"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={copyLink}>
              <CopyIcon className="size-4" />
              リンクをコピー
            </Button>
            {canShare && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={shareLink}
              >
                <Share2Icon className="size-4" />
                共有
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirming(true)}
            >
              <RefreshCwIcon className="size-4" />
              再発行
            </Button>
          </div>
          {rotated && (
            <p className="text-sm text-muted-foreground" role="status">
              以前のリンクは無効になり、「有効期限切れのリンク」と表示されます。参加者に新しいリンクを再度共有してください。
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          発行された招待リンクがありません。
        </p>
      )}

      <ConfirmActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={pending}
        title="招待リンクを再発行しますか?"
        description="現在のリンクはすぐに無効になり、開けなくなります。すでに受け付けた回答はそのまま保持されますが、参加者には新しいリンクを再度共有する必要があります。"
        confirmLabel="再発行"
        pendingLabel="発行しています..."
        onConfirm={confirmReissue}
      />
    </section>
  );
}
