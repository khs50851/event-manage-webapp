"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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

export function GroupForm({
  defaultValues = { name: "", description: "" },
  submitLabel,
  onSubmit,
}: {
  defaultValues?: GroupFormValues;
  submitLabel: string;
  onSubmit: (values: GroupFormValues) => void | Promise<void>;
}) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
