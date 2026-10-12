// Server Action 공통 결과 타입(모임·멤버·회차 쓰기 액션 계약).
// - unauthenticated: 세션 없음
// - validation: 입력 검증 실패(필드별 메시지는 fieldErrors) 또는 상태 규칙 위반
// - not_found: 대상이 없거나 소유자가 아님(존재 여부를 구분하지 않는다)
// - failed: 그 밖의 저장 실패(내부 정보 없이 사용자용 문구만 담는다)
export type ActionErrorCode =
  "unauthenticated" | "validation" | "not_found" | "failed";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      fieldErrors?: Record<string, string>;
    };
