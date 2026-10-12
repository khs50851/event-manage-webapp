"use server";

import { z } from "zod";

import { getPublicSettlementShare } from "@/lib/data/settlements";
import type { PublicMySettlementShare } from "@/lib/types/domain";

// 비회원 정산 조회용 Server Action(FR-10).
// 정산 토큰 자체가 접근 권한이므로 로그인은 요구하지 않고, 토큰·항목 id만으로 본인 항목을 읽는다.
// Server Action은 UI 밖에서도 POST로 호출될 수 있으므로 입력은 신뢰하지 않고 여기서 다시 검증한다.

// 토큰·항목 id 형태 검증. 실제 존재 여부는 데이터 계층에서 확인한다.
const myShareInputSchema = z.object({
  token: z.string().min(1).max(200),
  shareId: z.string().min(1).max(200),
});

// 실패 사유(무효·만료 토큰, 다른 정산의 항목, 없는 id, 형식 오류)는 구분하지 않는다.
// 사유를 나누면 토큰·항목 id의 유효성을 추측하는 단서가 되기 때문이다.
export type MySettlementShareResult =
  { ok: true; share: PublicMySettlementShare } | { ok: false };

// 이름을 고른 뒤 본인 항목의 금액·입금 상태만 돌려준다(읽기 전용).
// 요청 시점 데이터라 캐시하지 않는다("use cache" 미사용).
export async function getMySettlementShare(
  token: string,
  shareId: string,
): Promise<MySettlementShareResult> {
  const parsed = myShareInputSchema.safeParse({ token, shareId });
  if (!parsed.success) return { ok: false };

  const share = await getPublicSettlementShare(
    parsed.data.token,
    parsed.data.shareId,
  );
  if (!share) return { ok: false };

  // 데이터 계층 반환 형태가 바뀌어도 클라이언트로는 화면에 필요한 필드만 나가도록 다시 고른다.
  return {
    ok: true,
    share: { id: share.id, amount: share.amount, status: share.status },
  };
}
