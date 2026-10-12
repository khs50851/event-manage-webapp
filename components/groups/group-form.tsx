"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  applyFieldErrors,
  type FormSubmitOutcome,
} from "@/components/groups/action-feedback";
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
import { Textarea } from "@/components/ui/textarea";
import { groupSchema, type GroupFormValues } from "@/lib/schemas/group";

const GROUP_FIELDS = ["name", "description"] as const satisfies ReadonlyArray<
  keyof GroupFormValues
>;

export function GroupForm({
  defaultValues = { name: "", description: "" },
  submitLabel,
  onSubmit,
}: {
  defaultValues?: GroupFormValues;
  submitLabel: string;
  // 서버 검증 오류가 있으면 { fieldErrors, message }를 돌려준다(필드 오류로 표시).
  onSubmit: (
    values: GroupFormValues,
  ) => FormSubmitOutcome | Promise<FormSubmitOutcome>;
}) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues,
  });

  // await 동안 isSubmitting이 유지돼 버튼 비활성·진행 문구가 표시된다.
  async function submit(values: GroupFormValues) {
    const outcome = await onSubmit(values);
    applyFieldErrors(outcome, GROUP_FIELDS, (field, message) =>
      form.setError(field, { message }, { shouldFocus: true }),
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>모임 이름</FormLabel>
              <FormControl>
                <Input placeholder="예: 화요 수영반" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명 (선택)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "저장 중..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
