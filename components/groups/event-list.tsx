"use client";

import { CopyIcon, MapPinIcon, PlusIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EMPTY_EVENT_VALUES, EventForm } from "@/components/groups/event-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import type { EventFormValues } from "@/lib/schemas/event";
import type { EventStatus, GroupEvent } from "@/lib/types/domain";

const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "예정",
  cancelled: "취소됨",
  ended: "종료",
};

// 폼 다이얼로그 상태: 새 회차 / 수정 / 복제
type FormState =
  | { kind: "create" }
  | { kind: "edit"; event: GroupEvent }
  | { kind: "duplicate"; event: GroupEvent }
  | null;

function toFormValues(event: GroupEvent, clearDates: boolean): EventFormValues {
  return {
    title: event.title,
    startsAt: clearDates ? "" : event.startsAt,
    location: event.location,
    capacity: event.capacity === null ? "" : String(event.capacity),
    description: event.description,
    rsvpDeadline: clearDates ? "" : (event.rsvpDeadline ?? ""),
  };
}

export function EventList({
  groupId,
  events,
  onChange,
}: {
  groupId: string;
  events: GroupEvent[];
  onChange: (events: GroupEvent[]) => void;
}) {
  const [formState, setFormState] = useState<FormState>(null);
  const [cancelling, setCancelling] = useState<GroupEvent | null>(null);

  // 시작 시각 순으로 표시한다.
  const sorted = [...events].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  function handleSubmit(values: EventFormValues) {
    const fields = {
      title: values.title.trim(),
      startsAt: values.startsAt,
      location: values.location.trim(),
      capacity: values.capacity === "" ? null : Number(values.capacity),
      description: values.description.trim(),
      rsvpDeadline: values.rsvpDeadline === "" ? null : values.rsvpDeadline,
    };

    if (formState?.kind === "edit") {
      const targetId = formState.event.id;
      onChange(
        events.map((event) =>
          event.id === targetId ? { ...event, ...fields } : event,
        ),
      );
      toast.success("회차를 수정했습니다.");
    } else {
      onChange([
        ...events,
        {
          id: `e-${crypto.randomUUID()}`,
          groupId,
          status: "scheduled",
          ...fields,
        },
      ]);
      toast.success(
        formState?.kind === "duplicate"
          ? "회차를 복제했습니다."
          : "회차를 추가했습니다.",
      );
    }
    setFormState(null);
  }

  function confirmCancel() {
    if (!cancelling) return;
    const targetId = cancelling.id;
    onChange(
      events.map((event) =>
        event.id === targetId ? { ...event, status: "cancelled" } : event,
      ),
    );
    toast.success("회차를 취소했습니다. 초대 링크에는 취소 안내가 표시됩니다.");
    setCancelling(null);
  }

  const dialogTitle =
    formState?.kind === "edit"
      ? "회차 수정"
      : formState?.kind === "duplicate"
        ? "회차 복제"
        : "회차 추가";

  const defaultValues =
    formState?.kind === "edit"
      ? toFormValues(formState.event, false)
      : formState?.kind === "duplicate"
        ? toFormValues(formState.event, true)
        : EMPTY_EVENT_VALUES;

  return (
    <section aria-labelledby="events-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="events-heading" className="text-lg font-semibold">
          회차 ({events.length})
        </h2>
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          onClick={() => setFormState({ kind: "create" })}
        >
          <PlusIcon className="size-4" />
          회차 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            아직 등록된 회차가 없습니다.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFormState({ kind: "create" })}
          >
            첫 회차 추가
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-3 rounded-md border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/protected/events/${event.id}`}
                    className="font-semibold hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(event.startsAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    event.status === "scheduled" ? "default" : "secondary"
                  }
                >
                  {STATUS_LABEL[event.status]}
                </Badge>
              </div>
              <p className="flex items-center gap-1 text-sm">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                정원{" "}
                {event.capacity === null ? "제한 없음" : `${event.capacity}명`}
                {event.rsvpDeadline &&
                  ` · 응답 마감 ${formatDateTime(event.rsvpDeadline)}`}
              </p>
              {event.description && (
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={event.status === "cancelled"}
                  onClick={() => setFormState({ kind: "edit", event })}
                >
                  수정
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setFormState({ kind: "duplicate", event })}
                >
                  <CopyIcon className="size-4" />
                  복제
                </Button>
                {event.status === "scheduled" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 text-destructive"
                    onClick={() => setCancelling(event)}
                  >
                    <XCircleIcon className="size-4" />
                    취소
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {formState?.kind === "duplicate"
                ? "날짜를 새로 입력하면 나머지 항목은 그대로 복사됩니다."
                : "일시와 장소는 필수입니다."}
            </DialogDescription>
          </DialogHeader>
          {formState && (
            <EventForm
              // 대상이 바뀔 때 폼 상태를 새로 만든다.
              key={`${formState.kind}-${"event" in formState ? formState.event.id : "new"}`}
              defaultValues={defaultValues}
              submitLabel="저장"
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회차를 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{cancelling?.title}&quot; 회차가 취소됨 상태가 되고, 초대
              링크에는 취소 안내가 표시되며 새 응답을 받을 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              회차 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
