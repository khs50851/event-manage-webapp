import { z } from "zod";

import { personNameSchema } from "@/lib/schemas/common";

export const memberSchema = z.object({
  name: personNameSchema,
  memo: z.string().max(100, "メモは100文字以内で入力してください。"),
});

export type MemberFormValues = z.infer<typeof memberSchema>;
