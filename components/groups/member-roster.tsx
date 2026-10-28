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
import { ConfirmActionDialog } from "@/components/groups/confirm-action-dialog";
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
    toast.success(`${values.name.trim()}さんを追加しました。`);
  }

  // await 동안 isSubmitting이 유지돼 버튼 비활성·진행 문구가 표시된다. 실패하면 입력값을 그대로 둔다.
  async function submitMember(values: MemberFormValues) {
    try {
      const result = await addMember(groupId, values);
      if (result.ok) {
        const saved = result.data.member;
        onChange((current) => upsertById(current, saved));
        form.reset();
        toast.success(`${saved.name}さんを追加しました。`);
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
    toast.success(`${deleting.name}さんを名簿から削除しました。`);
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
        toast.success(`${target.name}さんを名簿から削除しました。`);
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
        メンバー名簿 ({members.length}名)
      </h2>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          メンバーを追加してみましょう(任意)。非会員も名前だけで登録できます。
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
                aria-label={`${member.name}を削除`}
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
                <FormLabel>名前</FormLabel>
                <FormControl>
                  <Input placeholder="メンバー名" {...field} />
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
                    同じ名前のメンバーがすでにいます。同姓同名の場合はそのまま追加してください。
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
                <FormLabel>連絡先メモ(任意)</FormLabel>
                <FormControl>
                  <Input placeholder="区別用のメモ" {...field} />
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
            {form.formState.isSubmitting
              ? "追加しています..."
              : "メンバーを追加"}
          </Button>
        </form>
      </Form>

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        pending={deletePending}
        title={<>{deleting?.name}さんを削除しますか?</>}
        description="名簿からのみ削除されます。過去の開催回の回答や精算記録は、名前のスナップショットとして保持されます。"
        confirmLabel="削除"
        pendingLabel="削除しています..."
        onConfirm={confirmDelete}
      />
    </section>
  );
}
