"use client";

import { CopyIcon, MapPinIcon, PlusIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import {
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useState,
} from "react";
import { toast } from "sonner";

import { cancelEvent, createEvent, updateEvent } from "@/app/actions/events";
import {
  type FormSubmitOutcome,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
  upsertById,
} from "@/components/groups/action-feedback";
import { ConfirmActionDialog } from "@/components/groups/confirm-action-dialog";
import { EMPTY_EVENT_VALUES, EventForm } from "@/components/groups/event-form";
import { EventStatusBadge } from "@/components/groups/event-status-badge";
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
import { getEventDisplayStatus } from "@/lib/rsvp";
import type { GroupEvent } from "@/lib/types/domain";

// 폼 다이얼로그 상태: 새 회차 / 수정 / 복제
type FormState =
  | { kind: "create" }
  | { kind: "edit"; event: GroupEvent }
  | { kind: "duplicate"; event: GroupEvent }
  | null;

type FormKind = NonNullable<FormState>["kind"];

const FORM_DIALOG_TITLE: Record<FormKind, string> = {
  create: "開催回を追加",
  edit: "開催回を編集",
  duplicate: "開催回を複製",
};

const SAVED_MESSAGE: Record<FormKind, string> = {
  create: "開催回を追加しました。",
  edit: "開催回を編集しました。",
  duplicate: "開催回を複製しました。",
};

const CANCELLED_MESSAGE =
  "開催回を中止しました。招待リンクには中止のお知らせが表示されます。";

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
  now,
  onChange,
}: {
  groupId: string;
  events: GroupEvent[];
  // 서버 요청 시점의 KST 시각. 상태 배지 판정용(하이드레이션 불일치 방지를 위해 서버 값을 받는다)
  now: string;
  // 함수형 갱신을 쓰므로 상위의 setState를 그대로 받는다(재검증 재렌더와 순서가 엇갈려도 최신 목록 기준으로 반영)
  onChange: Dispatch<SetStateAction<GroupEvent[]>>;
}) {
  const [formState, setFormState] = useState<FormState>(null);
  const [cancelling, setCancelling] = useState<GroupEvent | null>(null);
  const [cancelPending, setCancelPending] = useState(false);

  // 시작 시각 순으로 표시한다.
  const sorted = [...events].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateSubmit(values: EventFormValues) {
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
    }
    toast.success(SAVED_MESSAGE[formState?.kind ?? "create"]);
    setFormState(null);
  }

  async function handleSubmit(
    values: EventFormValues,
  ): Promise<FormSubmitOutcome> {
    if (!formState) return;
    const kind = formState.kind;
    try {
      // 복제도 새 회차 생성과 같은 액션을 쓴다(입력값이 복사돼 있을 뿐)
      const result =
        kind === "edit"
          ? await updateEvent(formState.event.id, values)
          : await createEvent(groupId, values);
      if (result.ok) {
        const saved = result.data.event;
        onChange((current) => upsertById(current, saved));
        toast.success(SAVED_MESSAGE[kind]);
        setFormState(null);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateSubmit(values);
        return;
      }
      return reportActionFailure(result);
    } catch (error) {
      reportActionException(error);
    }
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateCancel() {
    if (!cancelling) return;
    const targetId = cancelling.id;
    onChange(
      events.map((event) =>
        event.id === targetId ? { ...event, status: "cancelled" } : event,
      ),
    );
    toast.success(CANCELLED_MESSAGE);
    setCancelling(null);
  }

  async function confirmCancel(event: MouseEvent<HTMLButtonElement>) {
    // 저장이 끝날 때까지 대화상자를 열어 두고(실패 시 바로 재시도), 성공하면 닫는다.
    event.preventDefault();
    if (!cancelling || cancelPending) return;
    setCancelPending(true);
    try {
      const result = await cancelEvent(cancelling.id);
      if (result.ok) {
        const saved = result.data.event;
        onChange((current) => upsertById(current, saved));
        toast.success(CANCELLED_MESSAGE);
        setCancelling(null);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateCancel();
        return;
      }
      // 취소 확인에는 입력 필드가 없으므로 메시지만 안내한다.
      toast.error(result.message);
    } catch (error) {
      reportActionException(error);
    } finally {
      setCancelPending(false);
    }
  }

  // 닫히는 동안(formState === null)에도 제목이 비지 않도록 "회차 추가"로 둔다
  const dialogTitle = FORM_DIALOG_TITLE[formState?.kind ?? "create"];

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
          開催回 ({events.length})
        </h2>
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          onClick={() => setFormState({ kind: "create" })}
        >
          <PlusIcon className="size-4" />
          開催回を追加
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            まだ登録された開催回がありません。
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFormState({ kind: "create" })}
          >
            最初の開催回を追加
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
                    className="flex min-h-11 items-center font-semibold wrap-break-word hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(event.startsAt)}
                  </p>
                </div>
                <EventStatusBadge status={getEventDisplayStatus(event, now)} />
              </div>
              <p className="flex items-center gap-1 text-sm">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                定員{" "}
                {event.capacity === null ? "制限なし" : `${event.capacity}名`}
                {event.rsvpDeadline &&
                  `  · 回答締切 ${formatDateTime(event.rsvpDeadline)}`}
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
                  編集
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setFormState({ kind: "duplicate", event })}
                >
                  <CopyIcon className="size-4" />
                  複製
                </Button>
                {event.status === "scheduled" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    // 다크모드 outline 배경(input/30) 위 빨간 글씨 대비 확보
                    className="min-h-11 text-destructive dark:bg-background"
                    onClick={() => setCancelling(event)}
                  >
                    <XCircleIcon className="size-4" />
                    中止
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
                ? "日付を新しく入力すると、その他の項目はそのままコピーされます。"
                : "日時と場所は必ず入力してください。"}
            </DialogDescription>
          </DialogHeader>
          {formState && (
            <EventForm
              // 대상이 바뀔 때 폼 상태를 새로 만든다.
              key={`${formState.kind}-${"event" in formState ? formState.event.id : "new"}`}
              defaultValues={defaultValues}
              submitLabel="保存"
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        pending={cancelPending}
        title="この開催回を中止しますか?"
        description={
          <>
            「{cancelling?.title}
            」が「中止」の状態になり、招待リンクには中止のお知らせが表示され、新しい回答を受け付けられなくなります。
          </>
        }
        cancelLabel="戻る"
        confirmLabel="開催回を中止"
        pendingLabel="中止しています..."
        onConfirm={confirmCancel}
      />
    </section>
  );
}
