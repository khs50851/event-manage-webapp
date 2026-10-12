"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

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

export function EventForm({
  defaultValues = EMPTY_EVENT_VALUES,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: EventFormValues;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
}) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues,
  });

  const startsAt = useWatch({ control: form.control, name: "startsAt" });
  // 과거 시각은 막지 않고 경고만 한다. 입력 중에만 평가되므로 서버 렌더와 어긋나지 않는다.
  const isPast = startsAt !== "" && startsAt < nowLocalString();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>회차 제목</FormLabel>
              <FormControl>
                <Input placeholder="예: 10월 2주차 수영" {...field} />
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
              <FormLabel>일시</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              {isPast && (
                <p className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <TriangleAlertIcon className="size-4" />
                  과거 시각이에요. 그대로 저장할 수 있어요.
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
              <FormLabel>장소</FormLabel>
              <FormControl>
                <Input placeholder="예: 구립 체육센터" {...field} />
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
                <FormLabel>정원 (선택)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="제한 없음"
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
                <FormLabel>응답 마감 (선택)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
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
              <FormLabel>설명 (선택)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>준비물, 예상 비용 메모 등</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "저장 중..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
