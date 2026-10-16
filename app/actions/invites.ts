"use server";

import { revalidatePath } from "next/cache";

import {
  dbFailure,
  fail,
  getSessionClient,
  revalidateRsvpPaths,
  toFieldErrors,
  unauthenticated,
} from "@/lib/actions/shared";
import { isMockInviteToken } from "@/lib/data/invites";
import { ensureRespondentKey } from "@/lib/data/respondent-key";
import { isUuid } from "@/lib/data/source";
import { parseSubmitRsvpOutcome } from "@/lib/schemas/invite";
import {
  DIRECT_INPUT,
  rsvpSchema,
  type RsvpFormValues,
} from "@/lib/schemas/rsvp";
import { createClient } from "@/lib/supabase/server";
import type {
  ActionErrorCode,
  ActionResult,
  SubmitRsvpResult,
} from "@/lib/types/action";
import type { RsvpRejectReason } from "@/lib/types/domain";

// 초대 링크 관련 Server Action.
// - submitRsvp: 비회원·로그인 사용자 모두 호출 가능(세션 불필요). 실제 검증·저장·속도 제한은 DB 함수(submit_rsvp)가 한다.
//   여기서는 입력 재검증, 응답자 키 쿠키 발급, 사유별 안내 문구만 담당한다.
// - rotateInviteToken: 주최자 전용. 소유자 확인은 DB 함수가 하고 비소유자·없는 회차는 not_found.

// 사유별 응답 코드와 안내 문구
const REJECT_FEEDBACK: Record<
  RsvpRejectReason,
  { code: ActionErrorCode; message: string }
> = {
  invalid: {
    code: "not_found",
    message:
      "유효하지 않은 링크예요. 주최자에게 초대 링크를 다시 요청해 주세요.",
  },
  expired: {
    code: "not_found",
    message: "만료된 링크예요. 주최자에게 새 링크를 요청해 주세요.",
  },
  cancelled: {
    code: "validation",
    message: "취소된 회차라 응답을 받지 않아요.",
  },
  ended: {
    code: "validation",
    message: "종료된 회차라 응답을 받지 않아요.",
  },
  deadline: {
    code: "validation",
    message: "응답이 마감됐어요. 변경이 필요하면 주최자에게 알려 주세요.",
  },
  rate_limited: {
    code: "rate_limited",
    message: "요청이 너무 잦아요. 1분쯤 뒤에 다시 시도해 주세요.",
  },
  conflict: {
    code: "failed",
    message: "다른 요청과 겹쳐 저장하지 못했어요. 다시 시도해 주세요.",
  },
  validation: {
    code: "validation",
    message: "입력값을 다시 확인해 주세요.",
  },
  failed: {
    code: "failed",
    message: "응답을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  },
};

function reject(
  reason: RsvpRejectReason,
  fieldErrors?: Record<string, string>,
): SubmitRsvpResult {
  const { code, message } = REJECT_FEEDBACK[reason];
  return fieldErrors
    ? { ok: false, code, message, reason, fieldErrors }
    : { ok: false, code, message, reason };
}

// 초대 링크로 응답 제출(FR-06). 같은 응답자(로그인=계정, 비로그인=이 기기의 쿠키 키)는 기존 응답을 수정한다.
// 정원을 넘어도 접수하고 overCapacity로 알린다.
// 개발 환경 더미 토큰(demo-*)은 DB에 없으므로 code "unauthenticated"로 돌려준다
// (화면은 isDevPreviewFallback으로 기존 상태 시뮬레이션을 실행한다. 프로덕션에서는 발생하지 않는다).
export async function submitRsvp(
  token: string,
  values: RsvpFormValues,
): Promise<SubmitRsvpResult> {
  if (typeof token !== "string") return reject("invalid");
  if (isMockInviteToken(token)) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "개발 미리보기 링크라 저장하지 않아요.",
      reason: "invalid",
    };
  }

  const parsed = rsvpSchema.safeParse(values);
  if (!parsed.success) {
    return reject("validation", toFieldErrors(parsed.error));
  }
  const { memberId, name, status } = parsed.data;
  if (memberId !== DIRECT_INPUT && !isUuid(memberId)) {
    return reject("validation", {
      memberId: "명부에서 이름을 다시 선택해 주세요.",
    });
  }

  // 키 발급은 쿠키를 쓰므로 Server Action 안에서만 한다. 로그인 사용자는 DB가 계정으로만 매칭한다(Q11).
  const respondentKey = await ensureRespondentKey();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_rsvp", {
    p_token: token,
    p_respondent_key: respondentKey,
    p_name: name,
    p_status: status,
    ...(memberId !== DIRECT_INPUT ? { p_member_id: memberId } : {}),
  });
  if (error) {
    console.error("[submitRsvp] DB 오류:", error.code || "unknown");
    return reject("failed");
  }

  const outcome = parseSubmitRsvpOutcome(data);
  if (!outcome) {
    console.error("[submitRsvp] 응답 형식 오류");
    return reject("failed");
  }
  if (!outcome.ok) return reject(outcome.reason);

  // 주최자 화면(응답 현황·대시보드·정산)과 참여자 홈의 "참여한 모임"을 갱신한다.
  revalidateRsvpPaths();
  revalidatePath("/");
  return {
    ok: true,
    data: { rsvp: outcome.rsvp, overCapacity: outcome.overCapacity },
  };
}

// 초대 링크 재발급(주최자). 이전 링크는 즉시 만료된다(FR-05).
export async function rotateInviteToken(
  eventId: string,
): Promise<ActionResult<{ token: string }>> {
  const supabase = await getSessionClient();
  if (!supabase) return unauthenticated();
  if (!isUuid(eventId)) return fail("not_found", "회차를 찾을 수 없어요.");

  const { data, error } = await supabase.rpc("rotate_event_invite_token", {
    p_event_id: eventId,
  });
  if (error || !data) {
    return dbFailure("rotateInviteToken", error, {
      failed: "링크를 다시 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
      notFound: "회차를 찾을 수 없어요.",
    });
  }

  revalidatePath(`/protected/events/${eventId}`);
  return { ok: true, data: { token: data } };
}
