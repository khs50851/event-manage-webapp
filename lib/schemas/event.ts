import { z } from "zod";

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "회차 제목을 입력해 주세요.")
      .max(50, "제목은 50자 이하로 입력해 주세요."),
    startsAt: z.string().min(1, "일시를 선택해 주세요."),
    location: z
      .string()
      .trim()
      .min(1, "장소를 입력해 주세요.")
      .max(100, "장소는 100자 이하로 입력해 주세요."),
    // 비워두면 정원 제한 없음. 폼 입력은 문자열로 받는다.
    capacity: z
      .string()
      .refine(
        (value) => value === "" || /^[1-9]\d{0,3}$/.test(value),
        "정원은 1 이상의 정수로 입력해 주세요.",
      ),
    description: z.string().max(500, "설명은 500자 이하로 입력해 주세요."),
    rsvpDeadline: z.string(),
  })
  .refine(
    (values) =>
      values.rsvpDeadline === "" ||
      values.startsAt === "" ||
      values.rsvpDeadline <= values.startsAt,
    {
      message: "응답 마감은 시작 시각보다 늦을 수 없어요.",
      path: ["rsvpDeadline"],
    },
  );

export type EventFormValues = z.infer<typeof eventSchema>;
