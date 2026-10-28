"use client";

import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { removeAvatar, updateAvatar } from "@/app/actions/profile";
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
import { UserAvatar } from "@/components/user-avatar";
import { ImageResizeError, resizeImage } from "@/lib/image-resize";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_ORIGINAL_BYTES,
} from "@/lib/schemas/profile";

// 축소 결과 긴 변 최대 픽셀(서버가 다시 정사각형으로 재인코딩한다)
const RESIZE_MAX_SIDE = 1024;

const ALLOWED_TYPES: readonly string[] = AVATAR_ALLOWED_TYPES;

type Pending = "upload" | "remove" | null;

// 새 사진 URL을 미리 내려받아 두어 교체 순간 이니셜이 잠깐 보이는 깜빡임을 줄인다
async function preloadImage(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
}

// 용량과 상관없이 브라우저에서 한 번 줄여서(작은 사진은 크기 그대로 재인코딩만) 업로드할 파일을 만든다.
// 용량이 작아도 화소가 매우 큰 사진은 서버의 해상도 제한(약 2,500만 화소)에 걸릴 수 있기 때문이다.
async function prepareUpload(file: File): Promise<Blob> {
  return resizeImage(file, {
    maxSide: RESIZE_MAX_SIDE,
    maxBytes: AVATAR_MAX_BYTES,
    quality: 0.85,
  });
}

// 업로드 Blob의 파일 이름(서버는 형식을 매직 바이트로 다시 확인한다)
function fileNameFor(blob: Blob): string {
  if (blob.type === "image/webp") return "avatar.webp";
  if (blob.type === "image/png") return "avatar.png";
  return "avatar.jpg";
}

// 내 정보: 프로필 사진 표시 + 변경·삭제. 이름·이메일 등 정보 영역은 children으로 받는다.
export function AvatarUploader({
  name,
  avatarUrl: initialAvatarUrl,
  children,
}: {
  name: string;
  avatarUrl: string | null;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [pending, setPending] = useState<Pending>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const busy = pending !== null;

  // 작업이 끝나면 버튼이 다시 활성화되므로 "사진 변경" 버튼으로 포커스를 돌려준다
  // (비활성화되는 동안 포커스를 잃거나, 삭제 후 "사진 삭제" 버튼이 사라지는 경우 대비)
  function finish() {
    setPending(null);
    requestAnimationFrame(() => changeButtonRef.current?.focus());
  }

  async function applyAvatarUrl(url: string | null) {
    if (url) {
      // 미리 받지 못해도 Avatar가 로드 실패 시 이니셜로 대체하므로 무시한다
      await preloadImage(url).catch(() => undefined);
    }
    // 서버 데이터 갱신은 Server Action의 revalidatePath가 맡고, 여기서는 즉시 로컬에 반영한다
    setAvatarUrl(url);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change 이벤트가 나도록 비운다
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("JPG、PNG、WebPの写真のみアップロードできます。");
      return;
    }
    if (file.size > AVATAR_MAX_ORIGINAL_BYTES) {
      toast.error("写真の容量が大きすぎます(20MB以下)。");
      return;
    }

    setPending("upload");
    try {
      const blob = await prepareUpload(file);
      const formData = new FormData();
      formData.append("file", blob, fileNameFor(blob));
      const result = await updateAvatar(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await applyAvatarUrl(result.avatarUrl);
      toast.success("プロフィール写真を変更しました。");
    } catch (error) {
      toast.error(
        error instanceof ImageResizeError
          ? error.message
          : "写真をアップロードできませんでした。しばらくしてからもう一度お試しください。",
      );
    } finally {
      finish();
    }
  }

  async function handleRemove() {
    setPending("remove");
    try {
      const result = await removeAvatar();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await applyAvatarUrl(result.avatarUrl);
      toast.success("プロフィール写真を削除しました。");
    } catch {
      toast.error(
        "写真を削除できませんでした。しばらくしてからもう一度お試しください。",
      );
    } finally {
      finish();
    }
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={busy}>
      <div className="flex items-center gap-4">
        <UserAvatar name={name} avatarUrl={avatarUrl} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ALLOWED_TYPES.join(",")}
          aria-label="プロフィール写真のファイルを選択"
          // 버튼으로만 여는 숨김 입력이므로 탭 이동 대상에서 뺀다
          tabIndex={-1}
          className="sr-only"
          disabled={busy}
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            ref={changeButtonRef}
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            disabled={busy}
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            {pending === "upload" ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <CameraIcon aria-hidden />
            )}
            {pending === "upload" ? "アップロード中です" : "写真を変更"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
            >
              {pending === "remove" ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : (
                <Trash2Icon aria-hidden />
              )}
              {pending === "remove" ? "削除中です" : "写真を削除"}
            </Button>
          )}
        </div>
        <p id={hintId} className="text-xs text-muted-foreground">
          JPG・PNG・WebP。大きい写真は自動的に縮小してアップロードします。
        </p>
        {/* 진행 상태를 스크린 리더에 알린다(완료·실패는 토스트가 알린다) */}
        <p role="status" className="sr-only">
          {pending === "upload"
            ? "写真をアップロード中です。"
            : pending === "remove"
              ? "写真を削除中です。"
              : ""}
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プロフィール写真を削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              写真の代わりに名前の最初の文字が表示されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
