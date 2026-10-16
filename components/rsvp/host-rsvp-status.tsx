"use client";

import {
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";

import { deleteRsvp, upsertHostRsvp } from "@/app/actions/rsvps";
import {
  type FormSubmitOutcome,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
  upsertById,
} from "@/components/groups/action-feedback";
import { RsvpForm, type MemberOption } from "@/components/rsvp/rsvp-form";
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
import { UserAvatar } from "@/components/user-avatar";
import { nowKstLocalString } from "@/lib/format";
import {
  labelDuplicateNames,
  RSVP_STATUS_LABEL,
  RSVP_STATUS_ORDER,
  summarizeRsvps,
} from "@/lib/rsvp";
import { DIRECT_INPUT, type RsvpFormValues } from "@/lib/schemas/rsvp";
import type { GroupMember, Rsvp } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

// 대리 입력 다이얼로그 상태: 새 응답(미응답 멤버 지정 가능) / 기존 응답 수정
type FormState =
  | { kind: "create"; member?: GroupMember }
  | { kind: "edit"; rsvp: Rsvp }
  | null;

// 주최자 응답 현황(FR-07). 대리 입력·수정·삭제는 Server Action(upsertHostRsvp, deleteRsvp)으로 저장한다.
// useState 초기값은 재검증 재렌더에 반응하지 않으므로 액션 반환값으로 목록을 갱신한다.
// 비로그인 개발 미리보기에서만 화면 상태로 시뮬레이션한다(isDevPreviewFallback).
export function HostRsvpStatus({
  eventId,
  capacity,
  members,
  initialRsvps,
}: {
  eventId: string;
  capacity: number | null;
  members: GroupMember[];
  initialRsvps: Rsvp[];
}) {
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [formState, setFormState] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Rsvp | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const summary = summarizeRsvps(rsvps, capacity);
  const respondedMemberIds = new Set(rsvps.map((item) => item.memberId));
  // 미응답 = 명부 멤버 중 응답이 없는 사람
  const pending = members.filter(
    (member) => !respondedMemberIds.has(member.id),
  );
  const hasRoster = members.length > 0;

  // 주최자는 연락처 메모를 볼 수 있으므로 동명이인 구분에 메모를 덧붙인다.
  const memberOptions: MemberOption[] = labelDuplicateNames(members).map(
    (member) => ({
      id: member.id,
      name: member.name,
      label: member.memo ? `${member.label} · ${member.memo}` : member.label,
    }),
  );
  const memoById = new Map(members.map((member) => [member.id, member.memo]));

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateSubmit(values: RsvpFormValues, editingId: string | null) {
    const fields = {
      memberId: values.memberId === DIRECT_INPUT ? null : values.memberId,
      name: values.name.trim(),
      status: values.status,
      // 주최자가 입력·수정한 응답은 출처를 "주최자 입력"으로 남긴다(R3).
      source: "host" as const,
      respondedAt: nowKstLocalString(),
    };

    if (editingId) {
      setRsvps((current) =>
        current.map((item) =>
          item.id === editingId ? { ...item, ...fields } : item,
        ),
      );
      toast.success(`${fields.name} 님의 응답을 수정했어요.`);
    } else {
      setRsvps((current) => [
        ...current,
        { id: `r-${crypto.randomUUID()}`, eventId, ...fields },
      ]);
      toast.success(`${fields.name} 님의 응답을 추가했어요.`);
    }
    setFormState(null);
  }

  // await 동안 폼의 isSubmitting이 유지돼 저장 버튼이 비활성화된다.
  // 실패하면 다이얼로그를 열어 둔 채 입력값을 유지한다(이미 응답한 멤버는 이름 필드 오류로 표시).
  async function handleSubmit(
    values: RsvpFormValues,
  ): Promise<FormSubmitOutcome> {
    const editingId = formState?.kind === "edit" ? formState.rsvp.id : null;
    try {
      const result = await upsertHostRsvp(eventId, values, editingId);
      if (result.ok) {
        const saved = result.data.rsvp;
        setRsvps((current) => {
          // 사진 서명 URL 재발급이 실패해 비어 오면 기존 사진을 유지한다.
          const previous = current.find((item) => item.id === saved.id);
          return upsertById(current, {
            ...saved,
            avatarUrl: saved.avatarUrl ?? previous?.avatarUrl ?? null,
          });
        });
        toast.success(
          editingId
            ? `${saved.name} 님의 응답을 수정했어요.`
            : `${saved.name} 님의 응답을 추가했어요.`,
        );
        setFormState(null);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateSubmit(values, editingId);
        return;
      }
      return reportActionFailure(result);
    } catch (error) {
      reportActionException(error);
    }
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateDelete(target: Rsvp) {
    setRsvps((current) => current.filter((item) => item.id !== target.id));
    toast.success(`${target.name} 님의 응답을 삭제했어요.`);
    setDeleting(null);
  }

  async function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    // 삭제가 끝날 때까지 대화상자를 열어 두고(실패 시 바로 재시도), 성공하면 닫는다.
    event.preventDefault();
    if (!deleting || deletePending) return;
    const target = deleting;
    setDeletePending(true);
    try {
      const result = await deleteRsvp(eventId, target.id);
      if (result.ok) {
        setRsvps((current) => current.filter((item) => item.id !== target.id));
        toast.success(`${target.name} 님의 응답을 삭제했어요.`);
        setDeleting(null);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateDelete(target);
        return;
      }
      toast.error(result.message);
    } catch (error) {
      reportActionException(error);
    } finally {
      setDeletePending(false);
    }
  }

  const defaultValues: Partial<RsvpFormValues> | undefined =
    formState?.kind === "edit"
      ? {
          // 명부에서 삭제된 멤버의 응답이면 직접 입력으로 이어 쓴다.
          memberId:
            formState.rsvp.memberId && memoById.has(formState.rsvp.memberId)
              ? formState.rsvp.memberId
              : DIRECT_INPUT,
          name: formState.rsvp.name,
          status: formState.rsvp.status,
        }
      : formState?.kind === "create" && formState.member
        ? { memberId: formState.member.id, name: formState.member.name }
        : undefined;

  const stats = [
    {
      key: "attending",
      label: "참석",
      value:
        capacity === null
          ? `${summary.attending.length}명`
          : `${summary.attending.length}/${capacity}`,
      over: summary.overflow > 0,
    },
    { key: "declined", label: "불참", value: `${summary.declined.length}명` },
    { key: "undecided", label: "미정", value: `${summary.undecided.length}명` },
    {
      key: "pending",
      label: "미응답",
      value: hasRoster ? `${pending.length}명` : "-",
    },
  ];

  return (
    <section aria-labelledby="rsvp-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rsvp-heading" className="text-lg font-semibold">
          응답 현황
        </h2>
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          onClick={() => setFormState({ kind: "create" })}
        >
          <PlusIcon className="size-4" />
          대리 입력
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={cn(
              "flex flex-col gap-1 rounded-md border p-3",
              stat.over && "border-destructive bg-destructive/10",
            )}
          >
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {stat.value}
              {stat.over && (
                <Badge variant="destructive">초과 +{summary.overflow}</Badge>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {summary.overflow > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 text-sm font-medium text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          정원보다 {summary.overflow}명 많이 참석 응답했어요. 참석 인원을 확인해
          주세요.
        </p>
      )}

      {rsvps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            아직 응답이 없어요. 초대 링크를 공유해 보세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {RSVP_STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-md border">
              <h3 className="border-b px-3 py-2 text-sm font-semibold">
                {RSVP_STATUS_LABEL[status]} ({summary[status].length})
              </h3>
              {summary[status].length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">없음</p>
              ) : (
                <ul className="divide-y">
                  {summary[status].map((item) => {
                    const memo = item.memberId
                      ? memoById.get(item.memberId)
                      : undefined;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 px-3 py-1"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            name={item.name}
                            avatarUrl={item.avatarUrl}
                          />
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                            <span className="truncate font-medium">
                              {item.name}
                            </span>
                            {memo && (
                              <span className="truncate text-sm text-muted-foreground">
                                {memo}
                              </span>
                            )}
                            {item.source === "host" && (
                              <Badge variant="outline">주최자 입력</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`${item.name} 응답 수정`}
                            onClick={() =>
                              setFormState({ kind: "edit", rsvp: item })
                            }
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`${item.name} 응답 삭제`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {hasRoster && (
        <div className="rounded-md border">
          <h3 className="border-b px-3 py-2 text-sm font-semibold">
            미응답 ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              명부의 모든 멤버가 응답했어요.
            </p>
          ) : (
            <ul className="divide-y">
              {pending.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-2 px-3 py-1"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* 미응답 멤버는 계정과 연결되지 않으므로 이니셜만 보여준다 */}
                    <UserAvatar name={member.name} />
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                      <span className="truncate font-medium">
                        {member.name}
                      </span>
                      {member.memo && (
                        <span className="truncate text-sm text-muted-foreground">
                          {member.memo}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0"
                    onClick={() => setFormState({ kind: "create", member })}
                  >
                    대리 입력
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formState?.kind === "edit" ? "응답 수정" : "응답 대리 입력"}
            </DialogTitle>
            <DialogDescription>
              현장이나 구두로 받은 응답을 입력해요. 저장하면 출처가 &quot;주최자
              입력&quot;으로 표시돼요.
            </DialogDescription>
          </DialogHeader>
          {formState && (
            <RsvpForm
              // 대상이 바뀔 때 폼 상태를 새로 만든다.
              key={
                formState.kind === "edit"
                  ? `edit-${formState.rsvp.id}`
                  : `create-${formState.member?.id ?? "new"}`
              }
              memberOptions={memberOptions}
              defaultValues={defaultValues}
              submitLabel="저장"
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        // 삭제 처리 중에는 닫지 않는다(결과를 확인하고 재시도할 수 있게)
        onOpenChange={(open) => !open && !deletePending && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleting?.name} 님의 응답을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              응답 현황에서 사라지고, 명부 멤버라면 미응답으로 돌아가요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={deletePending} onClick={confirmDelete}>
              {deletePending ? "삭제하는 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
