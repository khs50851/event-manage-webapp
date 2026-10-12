"use client";

import {
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

// 주최자 응답 현황(FR-07). 대리 입력·수정·삭제는 화면 상태로만 시뮬레이션한다.
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

  function handleSubmit(values: RsvpFormValues) {
    const fields = {
      memberId: values.memberId === DIRECT_INPUT ? null : values.memberId,
      name: values.name.trim(),
      status: values.status,
      // 주최자가 입력·수정한 응답은 출처를 "주최자 입력"으로 남긴다(R3).
      source: "host" as const,
      respondedAt: nowKstLocalString(),
    };

    if (formState?.kind === "edit") {
      const targetId = formState.rsvp.id;
      setRsvps(
        rsvps.map((item) =>
          item.id === targetId ? { ...item, ...fields } : item,
        ),
      );
      toast.success(`${fields.name} 님의 응답을 수정했어요.`);
    } else {
      setRsvps([
        ...rsvps,
        { id: `r-${crypto.randomUUID()}`, eventId, ...fields },
      ]);
      toast.success(`${fields.name} 님의 응답을 추가했어요.`);
    }
    setFormState(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    setRsvps(rsvps.filter((item) => item.id !== deleting.id));
    toast.success(`${deleting.name} 님의 응답을 삭제했어요.`);
    setDeleting(null);
  }

  const defaultValues: Partial<RsvpFormValues> | undefined =
    formState?.kind === "edit"
      ? {
          memberId: formState.rsvp.memberId ?? DIRECT_INPUT,
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
        onOpenChange={(open) => !open && setDeleting(null)}
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
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
