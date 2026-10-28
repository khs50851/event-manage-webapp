import type { MouseEvent, ReactNode } from "react";

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

// 저장이 끝날 때까지 열어 두는 확인 대화상자(삭제·취소·재발급 공용, 클라이언트 컴포넌트에서만 사용).
// 처리 중(pending)에는 닫지 않고 두 버튼을 비활성화해, 실패 시 결과를 확인하고 바로 재시도할 수 있게 한다.
// onConfirm에서 event.preventDefault()를 호출해야 확인 버튼을 눌러도 대화상자가 바로 닫히지 않는다.
export function ConfirmActionDialog({
  open,
  onOpenChange,
  pending,
  title,
  description,
  cancelLabel = "キャンセル",
  confirmLabel,
  pendingLabel,
  onConfirm,
}: {
  open: boolean;
  // 처리 중이 아닐 때만 호출된다.
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  title: ReactNode;
  description: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  // 처리 중 확인 버튼 문구(예: "삭제하는 중...")
  pendingLabel: string;
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
