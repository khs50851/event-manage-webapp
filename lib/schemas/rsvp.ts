import { z } from "zod";

// 명부에서 이름을 고르지 않고 직접 입력하는 경우의 선택값
export const DIRECT_INPUT = "direct";

export const rsvpSchema = z.object({
  // 명부 멤버 id 또는 DIRECT_INPUT
  memberId: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요.")
    .max(30, "이름은 30자 이하로 입력해 주세요."),
  status: z.enum(["attending", "declined", "undecided"], {
    error: "참석 여부를 선택해 주세요.",
  }),
});

export type RsvpFormValues = z.infer<typeof rsvpSchema>;

// 응답 마감 시각 설정(FR-13). 비우면 마감 없음. 회차 시작 시각보다 늦을 수 없다(회차 폼과 같은 규칙).
export function makeRsvpDeadlineSchema(startsAt: string) {
  return z.object({
    rsvpDeadline: z
      .string()
      .refine(
        (value) => value === "" || value <= startsAt,
        "응답 마감은 시작 시각보다 늦을 수 없습니다.",
      ),
  });
}

export type RsvpDeadlineFormValues = z.infer<
  ReturnType<typeof makeRsvpDeadlineSchema>
>;
