"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { setRsvpDeadline } from "@/app/actions/events";
import {
  applyFieldErrors,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
} from "@/components/groups/action-feedback";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isDeadlinePassed } from "@/lib/rsvp";
import {
  makeRsvpDeadlineSchema,
  type RsvpDeadlineFormValues,
} from "@/lib/schemas/rsvp";
import type { EventStatus } from "@/lib/types/domain";

const DEADLINE_FIELDS = ["rsvpDeadline"] as const satisfies ReadonlyArray<
  keyof RsvpDeadlineFormValues
>;

// 응답 마감 시각 설정(FR-13). 저장은 setRsvpDeadline Server Action으로 하고, 저장된 값(액션 반환값)으로 화면을 갱신한다.
// 마감 여부의 첫 값은 서버가 요청 시점에 계산해 넘기고, 이후에는 저장할 때 다시 계산한다(렌더 중 시각 계산으로 인한 하이드레이션 불일치 방지).
// 비로그인 개발 미리보기에서만 화면 상태로 시뮬레이션한다(isDevPreviewFallback).
export function RsvpDeadlineCard({
  eventId,
  startsAt,
  eventStatus,
  initialDeadline,
  initialClosed,
}: {
  eventId: string;
  startsAt: string;
  eventStatus: EventStatus;
  initialDeadline: string | null;
  initialClosed: boolean;
}) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [closed, setClosed] = useState(initialClosed);
  // "지금 마감"·"마감 해제" 버튼은 폼 제출이 아니므로 처리 중 상태를 따로 둔다.
  const [pending, setPending] = useState(false);
  const disabled = eventStatus !== "scheduled";

  const form = useForm<RsvpDeadlineFormValues>({
    resolver: zodResolver(makeRsvpDeadlineSchema(startsAt)),
    defaultValues: { rsvpDeadline: initialDeadline ?? "" },
  });
  const busy = pending || form.formState.isSubmitting;

  // 저장된 마감 시각을 화면에 반영한다.
  function showSaved(next: string | null) {
    const nextClosed = isDeadlinePassed(next, nowKstLocalString());
    setDeadline(next);
    setClosed(nextClosed);
    form.reset({ rsvpDeadline: next ?? "" });
    toast.success(
      next === null
        ? "回答締切を解除しました。"
        : nextClosed
          ? "回答を締め切りました。招待リンクからの新しい回答は受け付けません。"
          : `回答締切を${formatDateTime(next)}に設定しました。`,
    );
  }

  // value: "YYYY-MM-DDTHH:mm"(한국 시간) 또는 빈 문자열(마감 해제)
  async function saveDeadline(value: string) {
    try {
      const result = await setRsvpDeadline(
        eventId,
        value === "" ? null : value,
      );
      if (result.ok) {
        showSaved(result.data.event.rsvpDeadline);
        return;
      }
      if (isDevPreviewFallback(result)) {
        showSaved(value === "" ? null : value);
        return;
      }
      applyFieldErrors(
        reportActionFailure(result),
        DEADLINE_FIELDS,
        (field, message) =>
          form.setError(field, { message }, { shouldFocus: true }),
      );
    } catch (error) {
      reportActionException(error);
    }
  }

  async function saveQuickly(value: string) {
    if (busy) return;
    setPending(true);
    try {
      await saveDeadline(value);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="deadline-heading"
      className="flex flex-col gap-3 rounded-md border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="deadline-heading" className="font-semibold">
          回答締切
        </h2>
        {!disabled && (
          <Badge
            variant={closed ? "secondary" : "default"}
            className={cn(closed && "bg-muted text-muted-foreground")}
          >
            {closed ? "締切済み" : "回答受付中"}
          </Badge>
        )}
      </div>
      <p className="text-sm" role="status">
        {disabled
          ? eventStatus === "cancelled"
            ? "中止された開催回のため、回答を受け付けていません。"
            : "終了した開催回のため、回答を受け付けていません。"
          : deadline === null
            ? "締切時刻はありません。開催回が終わるまで回答を受け付けます。"
            : closed
              ? `${formatDateTime(deadline)}に締め切られました。招待リンクには締切のお知らせが表示されます。`
              : `${formatDateTime(deadline)}まで回答を受け付けます。`}
      </p>

      {!disabled && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              saveDeadline(values.rsvpDeadline),
            )}
            className="flex flex-col gap-3"
            noValidate
          >
            <FormField
              control={form.control}
              name="rsvpDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>締切時刻</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      max={startsAt}
                      placeholder="締切なし"
                      clearable
                    />
                  </FormControl>
                  <FormDescription>
                    日本時間基準。空欄のまま保存すると、締切なしで受け付けます。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-11" disabled={busy}>
                {form.formState.isSubmitting
                  ? "保存しています..."
                  : "締切時刻を保存"}
              </Button>
              {!closed && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => saveQuickly(nowKstLocalString())}
                >
                  今すぐ締め切る
                </Button>
              )}
              {deadline !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => saveQuickly("")}
                >
                  締切を解除
                </Button>
              )}
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}
