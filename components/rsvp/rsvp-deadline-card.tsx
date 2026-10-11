"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import { isDeadlinePassed } from "@/lib/rsvp";
import {
  makeRsvpDeadlineSchema,
  type RsvpDeadlineFormValues,
} from "@/lib/schemas/rsvp";
import type { EventStatus } from "@/lib/types/domain";

// 응답 마감 시각 설정(FR-13). 저장은 화면 상태로만 시뮬레이션한다.
// 마감 여부의 첫 값은 서버가 요청 시점에 계산해 넘기고, 이후에는 저장할 때 다시 계산한다(렌더 중 시각 계산으로 인한 하이드레이션 불일치 방지).
export function RsvpDeadlineCard({
  startsAt,
  eventStatus,
  initialDeadline,
  initialClosed,
}: {
  startsAt: string;
  eventStatus: EventStatus;
  initialDeadline: string | null;
  initialClosed: boolean;
}) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [closed, setClosed] = useState(initialClosed);
  const disabled = eventStatus !== "scheduled";

  const form = useForm<RsvpDeadlineFormValues>({
    resolver: zodResolver(makeRsvpDeadlineSchema(startsAt)),
    defaultValues: { rsvpDeadline: initialDeadline ?? "" },
  });

  function applyDeadline(value: string) {
    const next = value === "" ? null : value;
    const nextClosed = isDeadlinePassed(next, nowKstLocalString());
    setDeadline(next);
    setClosed(nextClosed);
    form.reset({ rsvpDeadline: value });
    toast.success(
      next === null
        ? "응답 마감을 해제했습니다."
        : nextClosed
          ? "응답을 마감했습니다. 초대 링크에서 새 응답을 받지 않습니다."
          : `응답 마감을 ${formatDateTime(next)}로 설정했습니다.`,
    );
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
            ? "취소된 회차라 응답을 받지 않습니다."
            : "종료된 회차라 응답을 받지 않습니다."
          : deadline === null
            ? "마감 시각이 없습니다. 회차가 끝날 때까지 응답을 받습니다."
            : closed
              ? `${formatDateTime(deadline)}에 마감되었습니다. 초대 링크에는 마감 안내가 표시됩니다.`
              : `${formatDateTime(deadline)}까지 응답을 받습니다.`}
      </p>

      {!disabled && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              applyDeadline(values.rsvpDeadline),
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
                    <Input
                      type="datetime-local"
                      className="min-h-11"
                      max={startsAt}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    한국 시간 기준. 비워 두고 저장하면 마감 없이 받습니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="min-h-11"
                disabled={form.formState.isSubmitting}
              >
                마감 시각 저장
              </Button>
              {!closed && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => applyDeadline(nowKstLocalString())}
                >
                  지금 마감
                </Button>
              )}
              {deadline !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => applyDeadline("")}
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
