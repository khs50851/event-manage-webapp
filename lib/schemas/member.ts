import { z } from "zod";

export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요.")
    .max(30, "이름은 30자 이하로 입력해 주세요."),
  memo: z.string().max(100, "메모는 100자 이하로 입력해 주세요."),
});

export type MemberFormValues = z.infer<typeof memberSchema>;
