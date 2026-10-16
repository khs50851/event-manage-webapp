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
        ? "응답 마감을 해제했어요."
        : nextClosed
          ? "응답을 마감했어요. 초대 링크에서 새 응답을 받지 않아요."
          : `응답 마감을 ${formatDateTime(next)}로 설정했어요.`,
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
          응답 마감
        </h2>
        {!disabled && (
          <Badge variant={closed ? "secondary" : "default"}>
            {closed ? "마감됨" : "응답 받는 중"}
          </Badge>
        )}
      </div>
      <p className="text-sm" role="status">
        {disabled
          ? eventStatus === "cancelled"
            ? "취소된 회차라 응답을 받지 않아요."
            : "종료된 회차라 응답을 받지 않아요."
          : deadline === null
            ? "마감 시각이 없어요. 회차가 끝날 때까지 응답을 받아요."
            : closed
              ? `${formatDateTime(deadline)}에 마감됐어요. 초대 링크에는 마감 안내가 표시돼요.`
              : `${formatDateTime(deadline)}까지 응답을 받아요.`}
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
                  <FormLabel>마감 시각</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      max={startsAt}
                      placeholder="마감 없음"
                      clearable
                    />
                  </FormControl>
                  <FormDescription>
                    한국 시간 기준. 비워 두고 저장하면 마감 없이 받아요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-11" disabled={busy}>
                {form.formState.isSubmitting
                  ? "저장하는 중..."
                  : "마감 시각 저장"}
              </Button>
              {!closed && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => saveQuickly(nowKstLocalString())}
                >
                  지금 마감
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
                  마감 해제
                </Button>
              )}
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}
