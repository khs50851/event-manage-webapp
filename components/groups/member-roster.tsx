"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon, Trash2Icon } from "lucide-react";
import {
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { addMember, deleteMember } from "@/app/actions/members";
import {
  applyFieldErrors,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
  upsertById,
} from "@/components/groups/action-feedback";

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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { memberSchema, type MemberFormValues } from "@/lib/schemas/member";
import type { GroupMember } from "@/lib/types/domain";

const MEMBER_FIELDS = ["name", "memo"] as const satisfies ReadonlyArray<
  keyof MemberFormValues
>;

export function MemberRoster({
  groupId,
  members,
  onChange,
}: {
  groupId: string;
  members: GroupMember[];
  // 함수형 갱신을 쓰므로 상위의 setState를 그대로 받는다(재검증 재렌더와 순서가 엇갈려도 최신 목록 기준으로 반영)
  onChange: Dispatch<SetStateAction<GroupMember[]>>;
}) {
  const [deleting, setDeleting] = useState<GroupMember | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", memo: "" },
  });

  const typedName = useWatch({ control: form.control, name: "name" }).trim();
  // 동명이인은 허용하지만 추가 전에 경고한다.
  const isDuplicate =
    typedName !== "" && members.some((member) => member.name === typedName);

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateAdd(values: MemberFormValues) {
    onChange([
      ...members,
      {
        id: `m-${crypto.randomUUID()}`,
        groupId,
        name: values.name.trim(),
        memo: values.memo.trim(),
      },
    ]);
    form.reset();
    toast.success(`${values.name.trim()} 님을 추가했어요.`);
  }

  // await 동안 isSubmitting이 유지돼 버튼 비활성·진행 문구가 표시된다. 실패하면 입력값을 그대로 둔다.
  async function submitMember(values: MemberFormValues) {
    try {
      const result = await addMember(groupId, values);
      if (result.ok) {
        const saved = result.data.member;
        onChange((current) => upsertById(current, saved));
        form.reset();
        toast.success(`${saved.name} 님을 추가했어요.`);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateAdd(values);
        return;
      }
      applyFieldErrors(
        reportActionFailure(result),
        MEMBER_FIELDS,
        (field, message) =>
          form.setError(field, { message }, { shouldFocus: true }),
      );
    } catch (error) {
      reportActionException(error);
    }
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateDelete() {
    if (!deleting) return;
    onChange(members.filter((member) => member.id !== deleting.id));
    toast.success(`${deleting.name} 님을 명부에서 삭제했어요.`);
    setDeleting(null);
  }

  async function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    // 저장이 끝날 때까지 대화상자를 열어 두고(실패 시 바로 재시도), 성공하면 닫는다.
    event.preventDefault();
    if (!deleting || deletePending) return;
    const target = deleting;
    setDeletePending(true);
    try {
      const result = await deleteMember(groupId, target.id);
      if (result.ok) {
        onChange((current) =>
          current.filter((member) => member.id !== target.id),
        );
        toast.success(`${target.name} 님을 명부에서 삭제했어요.`);
        setDeleting(null);
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateDelete();
        return;
      }
      // 삭제 확인에는 입력 필드가 없으므로 메시지만 안내한다.
      toast.error(result.message);
    } catch (error) {
      reportActionException(error);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-4">
      <h2 id="members-heading" className="text-lg font-semibold">
        멤버 명부 ({members.length}명)
      </h2>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          멤버를 추가해 보세요. (선택) 비회원도 이름만으로 등록할 수 있어요.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name}</p>
                {member.memo && (
                  <p className="truncate text-sm text-muted-foreground">
                    {member.memo}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`${member.name} 삭제`}
                onClick={() => setDeleting(member)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submitMember)}
          className="flex flex-col gap-3 rounded-md border p-3"
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input placeholder="멤버 이름" {...field} />
                </FormControl>
                {isDuplicate && (
                  <p
                    role="status"
                    className="flex items-center gap-1 text-sm text-warning"
                  >
                    <TriangleAlertIcon
                      aria-hidden
                      className="size-4 shrink-0"
                    />
                    같은 이름의 멤버가 이미 있어요. 동명이인이면 그대로
                    추가하세요.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연락처 메모 (선택)</FormLabel>
                <FormControl>
                  <Input placeholder="구분용 메모" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "추가하는 중..." : "멤버 추가"}
          </Button>
        </form>
      </Form>

      <AlertDialog
        open={deleting !== null}
        // 삭제 처리 중에는 닫지 않는다(결과를 확인하고 재시도할 수 있게)
        onOpenChange={(open) => !open && !deletePending && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleting?.name} 님을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              명부에서만 삭제돼요. 과거 회차 응답과 정산 기록은 이름 스냅샷으로
              유지돼요.
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
