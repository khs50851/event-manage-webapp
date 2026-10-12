"use client";

import * as React from "react";

// 대화상자가 닫힐 때 열기 직전에 포커스가 있던 요소로 포커스를 돌려준다.
// Radix Dialog는 Trigger가 있을 때만 포커스를 되돌리므로, open 상태를 직접 제어하는
// 대화상자(여러 버튼이 같은 대화상자를 여는 경우)는 닫은 뒤 포커스가 body로 사라진다(키보드 사용자 위치 상실).
export function useReturnFocus<
  OpenEvent extends Event,
  CloseEvent extends Event,
>(
  onOpenAutoFocus?: (event: OpenEvent) => void,
  onCloseAutoFocus?: (event: CloseEvent) => void,
) {
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const handleOpenAutoFocus = React.useCallback(
    (event: OpenEvent) => {
      // 포커스가 대화상자 안으로 옮겨지기 전이므로 activeElement가 여는 버튼이다
      const active = document.activeElement;
      returnFocusRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      onOpenAutoFocus?.(event);
    },
    [onOpenAutoFocus],
  );

  const handleCloseAutoFocus = React.useCallback(
    (event: CloseEvent) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const target = returnFocusRef.current;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus({ preventScroll: true });
      }
    },
    [onCloseAutoFocus],
  );

  return { handleOpenAutoFocus, handleCloseAutoFocus };
}
