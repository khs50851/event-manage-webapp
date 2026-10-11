"use client";

import { CopyIcon, RefreshCwIcon, Share2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventStatus } from "@/lib/types/domain";

// 재발급 후 이전 링크가 어떻게 보이는지 확인하는 더미 만료 토큰(연동 단계 I3에서 제거)
const EXPIRED_PREVIEW_PATH = "/i/demo-swim-1-old";

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

// 주최자용 초대 링크 복사·공유·재발급(FR-05). 재발급은 화면 상태로만 시뮬레이션한다.
export function InviteLinkCard({
  eventTitle,
  eventStatus,
  initialToken,
}: {
  eventTitle: string;
  eventStatus: EventStatus;
  initialToken: string | null;
}) {
  const origin = useOrigin();
  const canShare = useCanShare();
  const [token, setToken] = useState(initialToken);
  const [previousToken, setPreviousToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const path = token ? `/i/${token}` : "";
  const url = `${origin}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("초대 링크를 복사했습니다.");
    } catch {
      toast.error("복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: eventTitle, url });
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우는 오류로 안내하지 않는다.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("공유하지 못했습니다. 링크 복사를 이용해 주세요.");
    }
  }

  function confirmReissue() {
    // 실제 토큰은 서버에서 발급하는 128비트 이상 무작위 값(FR-05). 여기서는 같은 길이로 흉내만 낸다.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const nextToken = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    setPreviousToken(token);
    setToken(nextToken);
    setConfirming(false);
    toast.success("새 초대 링크를 발급했습니다. 이전 링크는 만료됩니다.");
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
          취소된 회차입니다. 링크로 들어온 참가자에게는 취소 안내가 표시됩니다.
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
          {previousToken && (
            <p className="text-sm text-muted-foreground" role="status">
              이전 링크(/i/{previousToken})는 만료되어 &quot;만료된 링크&quot;
              안내가 표시됩니다.{" "}
              <Link href={EXPIRED_PREVIEW_PATH} className="underline">
                만료 화면 미리보기
              </Link>{" "}
              (더미: 새 링크는 연동 단계에서 실제로 열립니다)
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          발급된 초대 링크가 없습니다.
        </p>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>초대 링크를 재발급할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지금 링크는 즉시 만료되어 더 이상 열리지 않습니다. 이미 받은
              응답은 그대로 유지되며, 참가자에게는 새 링크를 다시 공유해야
              합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReissue}>
              재발급
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
