import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionErrorCode, ActionResult } from "@/lib/types/action";

// Server Action 공통 헬퍼(서버 전용). "use server" 파일은 async 함수만 export할 수 있으므로 여기에 둔다.
// 접근 제어의 최종 방어선은 DB RLS다. 여기서는 세션 확인·입력 재검증·오류 분류만 한다.

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const MESSAGES = {
  unauthenticated: "로그인이 필요해요.",
  validation: "입력값을 다시 확인해 주세요.",
} as const;

// 회차 응답이 바뀌었을 때 갱신할 화면: 대시보드(응답 미완료 카드)·회차 상세(응답 현황)·정산(응답 기반 항목),
// 모임 상세(회차 목록). 경로가 회차·모임 id에 걸쳐 있어 /protected 아래 전체를 갱신한다.
export function revalidateRsvpPaths() {
  revalidatePath("/protected", "layout");
}

export function fail(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return fieldErrors
    ? { ok: false, code, message, fieldErrors }
    : { ok: false, code, message };
}

// 세션 확인. 서버 클라이언트는 호출마다 새로 만든다(전역 보관 금지).
// 세션이 없으면 null(호출자는 unauthenticated로 응답).
export async function getSessionClient(): Promise<ServerSupabaseClient | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

export function unauthenticated(): ActionResult<never> {
  return fail("unauthenticated", MESSAGES.unauthenticated);
}

// Zod 검증 실패를 필드별 첫 메시지로 모은다(스키마의 한국어 메시지를 그대로 쓴다).
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function validationFailed(
  fieldErrors?: Record<string, string>,
  message: string = MESSAGES.validation,
): ActionResult<never> {
  return fail("validation", message, fieldErrors);
}

// 입력 검증에 해당하는 Postgres 오류: check·not null 위반, 잘못된 형식·시각 값
const VALIDATION_ERROR_CODES = new Set([
  "23514",
  "23502",
  "22P02",
  "22007",
  "22008",
  "22001",
]);
// 대상 없음·권한 없음으로 볼 오류: RLS(with check) 위반, 부모 행 없음(FK),
// 소유자 확인 RPC의 "없음/권한 없음"(P0002, 예: rotate_event_invite_token)
const NOT_FOUND_ERROR_CODES = new Set(["42501", "23503", "P0002"]);

type DbError = { code?: string } | null | undefined;

// DB 오류 분류. 내부 정보(메시지·제약 이름)는 돌려주지 않고 서버 로그에도 코드만 남긴다.
// notFoundMessage를 넘기면 RLS·FK 위반을 not_found로 본다(부모 모임/회차를 대상으로 쓰는 insert 등).
export function dbFailure(
  scope: string,
  error: DbError,
  messages: { failed: string; notFound?: string },
): ActionResult<never> {
  const code = error?.code ?? "";
  console.error(`[${scope}] DB 오류:`, code || "unknown");
  if (messages.notFound && NOT_FOUND_ERROR_CODES.has(code)) {
    return fail("not_found", messages.notFound);
  }
  if (VALIDATION_ERROR_CODES.has(code)) return validationFailed();
  return fail("failed", messages.failed);
}
