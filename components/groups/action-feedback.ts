import { toast } from "sonner";

import type { ActionResult } from "@/lib/types/action";

// 모임·회차·멤버 Server Action 결과를 화면에서 다루는 공용 헬퍼(클라이언트 컴포넌트에서만 사용).

export type ActionFailure = Extract<ActionResult<unknown>, { ok: false }>;

// 폼 컴포넌트(GroupForm/EventForm)가 제출 처리 후 돌려받는 값. fieldErrors가 있으면 해당 필드 오류로 표시한다.
// 폼에 없는 필드만 담겨 있으면 message를 토스트로 대신 보여준다.
export type FormSubmitOutcome = {
  fieldErrors: Record<string, string>;
  message: string;
} | void;

// 액션 호출 자체가 실패(네트워크 끊김 등)했을 때의 안내
const NETWORK_FAILURE_MESSAGE =
  "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

// 비로그인 개발 미리보기 폴백 여부.
// proxy의 목업 미리보기(개발 환경 /protected/* 비로그인 열람)에서는 세션이 없어 액션이 unauthenticated를 돌려준다.
// 이때만 기존 화면 상태 시뮬레이션을 실행한다. NODE_ENV는 빌드 시 인라인되므로 프로덕션 번들에서는 항상 false다.
// 연동 단계(I2-6)에서 목업 미리보기를 제거할 때 이 폴백도 함께 제거한다.
export function isDevPreviewFallback(result: ActionFailure): boolean {
  return (
    result.code === "unauthenticated" && process.env.NODE_ENV !== "production"
  );
}

// 폴백이 아닌 실패 안내. 필드 오류가 있으면 폼에 넘기고, 없으면 서버 메시지를 그대로 토스트로 보여준다.
export function reportActionFailure(result: ActionFailure): FormSubmitOutcome {
  if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
    return { fieldErrors: result.fieldErrors, message: result.message };
  }
  toast.error(result.message);
}

// 폼 필드 오류 적용. 폼에 있는 필드만 setError로 표시하고, 하나도 없으면 토스트로 안내한다.
export function applyFieldErrors<Field extends string>(
  outcome: FormSubmitOutcome,
  fields: readonly Field[],
  setError: (field: Field, message: string) => void,
) {
  if (!outcome) return;
  let applied = 0;
  for (const field of fields) {
    const message = outcome.fieldErrors[field];
    if (message) {
      setError(field, message);
      applied += 1;
    }
  }
  if (applied === 0) toast.error(outcome.message);
}

// 액션 호출이 예외로 끝난 경우(서버 응답을 받지 못함). 화면 상태는 그대로 두어 재시도할 수 있게 한다.
export function reportActionException(error: unknown) {
  console.error(error);
  toast.error(NETWORK_FAILURE_MESSAGE);
}

// id 기준으로 목록의 항목을 교체하거나(있으면) 끝에 추가한다(없으면).
// 액션 반환값과 revalidatePath 재렌더 결과가 어떤 순서로 적용돼도 중복되지 않게 한다.
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((current) => current.id === item.id)
    ? list.map((current) => (current.id === item.id ? item : current))
    : [...list, item];
}
