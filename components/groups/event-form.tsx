"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import {
  applyFieldErrors,
  type FormSubmitOutcome,
} from "@/components/groups/action-feedback";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { nowLocalString } from "@/lib/format";
import { eventSchema, type EventFormValues } from "@/lib/schemas/event";

export const EMPTY_EVENT_VALUES: EventFormValues = {
  title: "",
  startsAt: "",
  location: "",
  capacity: "",
  description: "",
  rsvpDeadline: "",
};

const EVENT_FIELDS = [
  "title",
  "startsAt",
  "location",
  "capacity",
  "description",
  "rsvpDeadline",
] as const satisfies ReadonlyArray<keyof EventFormValues>;

export function EventForm({
  defaultValues = EMPTY_EVENT_VALUES,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: EventFormValues;
  submitLabel: string;
  // 서버 검증 오류가 있으면 { fieldErrors, message }를 돌려준다(필드 오류로 표시).
  onSubmit: (
    values: EventFormValues,
  ) => FormSubmitOutcome | Promise<FormSubmitOutcome>;
}) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  });

  // await 동안 isSubmitting이 유지돼 버튼 비활성·진행 문구가 표시된다.
  async function submit(values: EventFormValues) {
    const outcome = await onSubmit(values);
    applyFieldErrors(outcome, EVENT_FIELDS, (field, message) =>
      form.setError(field, { message }, { shouldFocus: true }),
    );
  }

  const startsAt = useWatch({ control: form.control, name: "startsAt" });
  // 과거 시각은 막지 않고 경고만 한다. 입력 중에만 평가되므로 서버 렌더와 어긋나지 않는다.
  const isPast = startsAt !== "" && startsAt < nowLocalString();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>開催回のタイトル</FormLabel>
              <FormControl>
                <Input placeholder="例:10月第2週 スイミング" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>日時</FormLabel>
              <FormControl>
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="日時を選択"
                />
              </FormControl>
              {isPast && (
                <p
                  role="status"
                  className="flex items-center gap-1 text-sm text-warning"
                >
                  <TriangleAlertIcon aria-hidden className="size-4 shrink-0" />
                  過去の日時です。このまま保存できます。
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>場所</FormLabel>
              <FormControl>
                <Input placeholder="例:区立スポーツセンター" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>定員(任意)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="制限なし"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rsvpDeadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>回答締切(任意)</FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    max={startsAt}
                    placeholder="締切なし"
                    clearable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明(任意)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>持ち物、想定費用のメモなど</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
