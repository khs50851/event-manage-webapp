"use client";

import { CopyIcon, RefreshCwIcon, Share2Icon } from "lucide-react";
import { type MouseEvent, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { rotateInviteToken } from "@/app/actions/invites";
import {
  isDevPreviewFallback,
  reportActionException,
} from "@/components/groups/action-feedback";
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
      toast.success("초대 링크를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: eventTitle, url });
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우는 오류로 안내하지 않는다.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("공유하지 못했어요. 링크 복사를 이용해 주세요.");
    }
  }

  function applyNewToken(nextToken: string) {
    setToken(nextToken);
    setRotated(true);
    setConfirming(false);
    toast.success("새 초대 링크를 발급했어요. 이전 링크는 만료돼요.");
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
        초대 링크
      </h2>
      {eventStatus === "cancelled" && (
        <p className="text-sm text-muted-foreground">
          취소된 회차예요. 링크로 들어온 참가자에게는 취소 안내가 표시돼요.
        </p>
      )}

      {token ? (
        <>
          <label htmlFor="invite-link-url" className="sr-only">
            초대 링크 주소
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
              링크 복사
            </Button>
            {canShare && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={shareLink}
              >
                <Share2Icon className="size-4" />
                공유
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirming(true)}
            >
              <RefreshCwIcon className="size-4" />
              재발급
            </Button>
          </div>
          {rotated && (
            <p className="text-sm text-muted-foreground" role="status">
              이전 링크는 만료되어 &quot;만료된 링크&quot; 안내가 표시돼요.
              참가자에게 새 링크를 다시 공유해 주세요.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          발급된 초대 링크가 없어요.
        </p>
      )}

      <AlertDialog
        open={confirming}
        // 발급 처리 중에는 닫지 않는다(결과를 확인하고 재시도할 수 있게)
        onOpenChange={(open) => !pending && setConfirming(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>초대 링크를 재발급할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지금 링크는 즉시 만료되어 더 이상 열리지 않아요. 이미 받은 응답은
              그대로 유지되며, 참가자에게는 새 링크를 다시 공유해야 해요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirmReissue}>
              {pending ? "발급하는 중..." : "재발급"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
