"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RSVP_STATUS_LABEL, RSVP_STATUS_ORDER } from "@/lib/rsvp";
import {
  DIRECT_INPUT,
  rsvpSchema,
  type RsvpFormValues,
} from "@/lib/schemas/rsvp";

export type MemberOption = { id: string; name: string; label: string };

export const EMPTY_RSVP_VALUES: Partial<RsvpFormValues> = {
  memberId: "",
  name: "",
  status: undefined,
};

// 참가자 응답 폼. 비회원 초대 페이지와 주최자 대리 입력에서 함께 쓴다.
// 명부가 있으면 이름을 고르거나 직접 입력하고, 명부가 없으면 이름 입력만 보인다.
export function RsvpForm({
  memberOptions,
  defaultValues = EMPTY_RSVP_VALUES,
  submitLabel,
  onSubmit,
}: {
  memberOptions: MemberOption[];
  defaultValues?: Partial<RsvpFormValues>;
  submitLabel: string;
  onSubmit: (values: RsvpFormValues) => void | Promise<void>;
}) {
  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      ...defaultValues,
      memberId:
        memberOptions.length === 0
          ? DIRECT_INPUT
          : (defaultValues.memberId ?? ""),
    },
  });

  const memberId = useWatch({ control: form.control, name: "memberId" });
  const hasRoster = memberOptions.length > 0;
  const showNameInput = !hasRoster || memberId === DIRECT_INPUT;
  const nameError = form.formState.errors.name;

  function handleMemberChange(value: string) {
    form.setValue("memberId", value);
    const member = memberOptions.find((option) => option.id === value);
    // 명부 멤버를 고르면 이름 스냅샷을 채우고, 직접 입력으로 바꾸면 비운다.
    form.setValue("name", member ? member.name : "", {
      shouldValidate: form.formState.isSubmitted,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        {hasRoster && (
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <Select value={field.value} onValueChange={handleMemberChange}>
                  <FormControl>
                    <SelectTrigger
                      className="min-h-11 w-full"
                      aria-invalid={!showNameInput && !!nameError}
                    >
                      <SelectValue placeholder="명부에서 이름 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {memberOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={DIRECT_INPUT}>
                      목록에 없어요 (직접 입력)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {/* 이름 입력란이 숨겨진 상태의 이름 오류는 선택 상자 아래에 보여준다 */}
                {!showNameInput && nameError && (
                  <p className="text-sm font-medium text-destructive">
                    이름을 선택하거나 &quot;직접 입력&quot;을 골라 주세요.
                  </p>
                )}
              </FormItem>
            )}
          />
        )}

        {showNameInput && (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{hasRoster ? "직접 입력할 이름" : "이름"}</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-11"
                    placeholder="이름 (30자 이내)"
                    autoComplete="name"
                    maxLength={30}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>참석 여부</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  aria-label="참석 여부"
                  className="grid grid-cols-3 gap-2"
                >
                  {RSVP_STATUS_ORDER.map((status) => (
                    <label
                      key={status}
                      className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border px-2 text-sm font-medium transition-colors hover:bg-accent has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10"
                    >
                      <RadioGroupItem value={status} />
                      {RSVP_STATUS_LABEL[status]}
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="min-h-11"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "제출 중..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
