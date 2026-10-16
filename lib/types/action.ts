import type { RsvpRejectReason, Rsvp } from "@/lib/types/domain";

// Server Action 공통 결과 타입(모임·멤버·회차 쓰기 액션 계약).
// - unauthenticated: 세션 없음
// - validation: 입력 검증 실패(필드별 메시지는 fieldErrors) 또는 상태 규칙 위반
// - not_found: 대상이 없거나 소유자가 아님(존재 여부를 구분하지 않는다)
// - rate_limited: 요청이 너무 잦음(DB 측 속도 제한, 응답 제출)
// - failed: 그 밖의 저장 실패(내부 정보 없이 사용자용 문구만 담는다)
export type ActionErrorCode =
  "unauthenticated" | "validation" | "not_found" | "rate_limited" | "failed";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      fieldErrors?: Record<string, string>;
    };

// 비회원 응답 제출(submitRsvp) 결과. 실패 시 화면 안내를 고를 수 있도록 거부 사유(reason)를 함께 담는다.
// 실패 형태는 ActionResult의 실패와 호환된다(공용 실패 처리 헬퍼를 그대로 쓸 수 있다).
export type SubmitRsvpResult =
  | {
      ok: true;
      data: {
        rsvp: Rsvp;
        // 제출 후 참석 인원이 정원을 넘었는지(접수는 됨)
        overCapacity: boolean;
      };
    }
  | (Extract<ActionResult<never>, { ok: false }> & {
      reason: RsvpRejectReason;
    });
