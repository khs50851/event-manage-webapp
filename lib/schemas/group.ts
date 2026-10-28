import { z } from "zod";

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "グループ名を入力してください。")
    .max(50, "グループ名は50文字以内で入力してください。"),
  description: z.string().max(200, "説明は200文字以内で入力してください。"),
});

export type GroupFormValues = z.infer<typeof groupSchema>;
