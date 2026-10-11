import { z } from "zod";

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "모임 이름을 입력해 주세요.")
    .max(50, "모임 이름은 50자 이하로 입력해 주세요."),
  description: z.string().max(200, "설명은 200자 이하로 입력해 주세요."),
});

export type GroupFormValues = z.infer<typeof groupSchema>;
