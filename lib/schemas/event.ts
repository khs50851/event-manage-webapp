import { z } from "zod";

import { RSVP_DEADLINE_AFTER_START_MESSAGE } from "@/lib/schemas/common";

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "開催回のタイトルを入力してください。")
      .max(50, "タイトルは50文字以内で入力してください。"),
    startsAt: z.string().min(1, "日時を選択してください。"),
    location: z
      .string()
      .trim()
      .min(1, "場所を入力してください。")
      .max(100, "場所は100文字以内で入力してください。"),
    // 비워두면 정원 제한 없음. 폼 입력은 문자열로 받는다.
    capacity: z
      .string()
      .refine(
        (value) => value === "" || /^[1-9]\d{0,3}$/.test(value),
        "定員は1以上の整数で入力してください。",
      ),
    description: z.string().max(500, "説明は500文字以内で入力してください。"),
    rsvpDeadline: z.string(),
  })
  .refine(
    (values) =>
      values.rsvpDeadline === "" ||
      values.startsAt === "" ||
      values.rsvpDeadline <= values.startsAt,
    {
      message: RSVP_DEADLINE_AFTER_START_MESSAGE,
      path: ["rsvpDeadline"],
    },
  );

export type EventFormValues = z.infer<typeof eventSchema>;
