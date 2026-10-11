"use client";

import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { PublicRsvpList } from "@/components/rsvp/public-rsvp-list";
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import {
  labelDuplicateNames,
  RSVP_STATUS_LABEL,
  summarizeRsvps,
} from "@/lib/rsvp";
import { DIRECT_INPUT, type RsvpFormValues } from "@/lib/schemas/rsvp";
import type { PublicMember, Rsvp } from "@/lib/types/domain";

const OVER_CAPACITY_MESSAGE = "정원이 초과되었습니다. 주최자가 확인합니다";

// 비회원 RSVP 영역. 제출·수정은 화면 상태로만 시뮬레이션한다(새로고침 시 초기화).
// "이 기기에서 낸 응답"은 실제로는 브라우저 로컬 식별자로 연결하지만(A2), UI 단계에서는 myRsvpId 상태로 대신한다.
export function InviteRsvpPanel({
  eventId,
  capacity,
  members,
  initialRsvps,
}: {
  eventId: string;
  capacity: number | null;
  members: PublicMember[];
  initialRsvps: Rsvp[];
}) {
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [myRsvpId, setMyRsvpId] = useState<string | null>(null);
  const [mode, setMode] = useState<"form" | "done">("form");
  const [overCapacity, setOverCapacity] = useState(false);

  const myRsvp = rsvps.find((item) => item.id === myRsvpId) ?? null;
  const memberOptions = labelDuplicateNames(members);
  const summary = summarizeRsvps(rsvps, capacity);
  // 정원이 이미 찼으면 제출 전에 미리 알린다(거부하지 않음, Q3).
  const isFull = capacity !== null && summary.attending.length >= capacity;

  function handleSubmit(values: RsvpFormValues) {
    const fields = {
      memberId: values.memberId === DIRECT_INPUT ? null : values.memberId,
      name: values.name.trim(),
      status: values.status,
      respondedAt: nowKstLocalString(),
    };

    const next = myRsvp
      ? rsvps.map((item) =>
          item.id === myRsvp.id
            ? { ...item, ...fields, source: "self" as const }
            : item,
        )
      : [
          ...rsvps,
          {
            id: `r-${crypto.randomUUID()}`,
            eventId,
            source: "self" as const,
            ...fields,
          },
        ];

    if (!myRsvp) setMyRsvpId(next[next.length - 1].id);
    setRsvps(next);
    // 정원 초과여도 접수하고 안내만 한다(Q3).
    setOverCapacity(
      values.status === "attending" &&
        summarizeRsvps(next, capacity).overflow > 0,
    );
    setMode("done");
  }

  return (
    <div className="flex flex-col gap-8">
      {mode === "done" && myRsvp ? (
        <Card role="status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleCheckIcon className="size-5 text-primary" />
              응답이 접수되었습니다
            </CardTitle>
            <CardDescription>
              {myRsvp.name} 님 · {RSVP_STATUS_LABEL[myRsvp.status]} (
              {formatDateTime(myRsvp.respondedAt)})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {overCapacity && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {OVER_CAPACITY_MESSAGE}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              이 기기에서 다시 열면 응답을 수정할 수 있어요.
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setMode("form")}
            >
              응답 수정하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section
          aria-labelledby="rsvp-form-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="rsvp-form-heading" className="text-lg font-semibold">
            {myRsvp ? "내 응답 수정" : "참석 여부 응답"}
          </h2>
          {myRsvp && (
            <p className="rounded-md border bg-muted p-3 text-sm">
              이 기기에서 이미 응답했어요. 이전 응답:{" "}
              <strong>
                {myRsvp.name} · {RSVP_STATUS_LABEL[myRsvp.status]}
              </strong>
            </p>
          )}
          {isFull && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              정원이 찼어요. 참석으로 응답해도 접수되며 주최자가 확인합니다.
            </p>
          )}
          <RsvpForm
            // 수정 모드에 들어갈 때 이전 응답으로 폼을 새로 만든다.
            key={myRsvp ? `edit-${myRsvp.id}-${myRsvp.respondedAt}` : "new"}
            memberOptions={memberOptions}
            defaultValues={
              myRsvp
                ? {
                    memberId: myRsvp.memberId ?? DIRECT_INPUT,
                    name: myRsvp.name,
                    status: myRsvp.status,
                  }
                : undefined
            }
            submitLabel={myRsvp ? "응답 수정" : "응답 제출"}
            onSubmit={handleSubmit}
          />
        </section>
      )}

      <PublicRsvpList rsvps={rsvps} capacity={capacity} myRsvpId={myRsvpId} />
    </div>
  );
}
