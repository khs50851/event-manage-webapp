import { z } from "zod";

import { PAYMENT_GUIDE_MAX_LENGTH, parseWonInput } from "@/lib/settlement";

// 정산 생성·수정 폼(U4-2, U4-3). 총액은 폼 입력 문자열로 받고 제출 시 parseWonInput()으로 정수로 바꾼다.
// 정산 대상 수(N) 검증은 대상 선택 상태에 달려 있어 폼 밖에서 calculateSplit()으로 한다.
export const settlementSchema = z.object({
  // 원 단위 정수(천 단위 쉼표 허용). 비었거나, 소수·문자이거나, 0 이하이거나, 1억 원 초과면 오류.
  totalAmount: z.string().superRefine((value, ctx) => {
    const parsed = parseWonInput(value);
    if (!parsed.ok) ctx.addIssue(parsed.message);
  }),
  paymentGuide: z
    .string()
    .trim()
    .min(1, "振込案内文を入力してください。(例:OO銀行 123-456 山田太郎)")
    .max(
      PAYMENT_GUIDE_MAX_LENGTH,
      `振込案内文は${PAYMENT_GUIDE_MAX_LENGTH}文字以内で入力してください。`,
    ),
  // 주최자 본인을 정산 인원에 포함(Q5)
  hostIncluded: z.boolean(),
});

export type SettlementFormValues = z.infer<typeof settlementSchema>;
