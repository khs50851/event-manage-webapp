"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

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

export function MemberRoster({
  groupId,
  members,
  onChange,
}: {
  groupId: string;
  members: GroupMember[];
  onChange: (members: GroupMember[]) => void;
}) {
  const [deleting, setDeleting] = useState<GroupMember | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", memo: "" },
  });

  const typedName = useWatch({ control: form.control, name: "name" }).trim();
  // 동명이인은 허용하지만 추가 전에 경고한다.
  const isDuplicate =
    typedName !== "" && members.some((member) => member.name === typedName);

  function addMember(values: MemberFormValues) {
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
    toast.success(`${values.name.trim()} 님을 추가했습니다.`);
  }

  function confirmDelete() {
    if (!deleting) return;
    onChange(members.filter((member) => member.id !== deleting.id));
    toast.success(`${deleting.name} 님을 명부에서 삭제했습니다.`);
    setDeleting(null);
  }

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-4">
      <h2 id="members-heading" className="text-lg font-semibold">
        멤버 명부 ({members.length}명)
      </h2>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          멤버를 추가해 보세요. (선택) 비회원도 이름만으로 등록할 수 있습니다.
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
          onSubmit={form.handleSubmit(addMember)}
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
                  <p className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                    <TriangleAlertIcon className="size-4" />
                    같은 이름의 멤버가 이미 있습니다. 동명이인이면 그대로
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
          <Button type="submit" variant="secondary">
            멤버 추가
          </Button>
        </form>
      </Form>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleting?.name} 님을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              명부에서만 삭제됩니다. 과거 회차 응답과 정산 기록은 이름
              스냅샷으로 유지됩니다.
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
