"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatWon } from "@/lib/format";
import {
  settlementSchema,
  type SettlementFormValues,
} from "@/lib/schemas/settlement";
import {
  calculateSplit,
  PAYMENT_GUIDE_MAX_LENGTH,
  parseWonInput,
} from "@/lib/settlement";

// 제출 시 부모에게 넘기는 값(총액은 원 단위 정수로 변환됨)
export type SettlementFormSubmit = {
  totalAmount: number;
  paymentGuide: string;
  hostIncluded: boolean;
};

export const EMPTY_SETTLEMENT_VALUES: SettlementFormValues = {
  totalAmount: "",
  paymentGuide: "",
  hostIncluded: false,
};

// 정산 생성·수정 폼(U4-3). 총액·안내 문구·주최자 포함(Q5)을 입력받고,
// 현재 대상 수(participantCount)로 1인 금액 미리보기를 즉시 보여준다(U4-4).
// 대상 0명처럼 폼 밖 상태에 따른 계산 오류도 미리보기 자리에 인라인으로 표시한다(U4-2).
// targetPicker: 대상 선택기를 총액 아래에 끼워 넣는 슬롯(선택 상태는 부모가 소유).
export function SettlementForm({
  participantCount,
  defaultValues = EMPTY_SETTLEMENT_VALUES,
  submitLabel,
  onSubmit,
  onCancel,
  targetPicker,
}: {
  participantCount: number;
  defaultValues?: SettlementFormValues;
  submitLabel: string;
  onSubmit: (values: SettlementFormSubmit) => void | Promise<void>;
  onCancel?: () => void;
  targetPicker?: React.ReactNode;
}) {
  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues,
  });

  const [rawTotal, hostIncluded] = useWatch({
    control: form.control,
    name: ["totalAmount", "hostIncluded"],
  });
  const parsedTotal = parseWonInput(rawTotal);
  // 총액이 올바를 때만 대상 수 관련 미리보기·오류를 계산한다(총액 오류는 필드 메시지로 표시).
  const preview = parsedTotal.ok
    ? calculateSplit({
        totalAmount: parsedTotal.value,
        participantCount,
        hostIncluded,
      })
    : null;

  async function handleSubmit(values: SettlementFormValues) {
    const total = parseWonInput(values.totalAmount);
    // 스키마 검증을 통과했으므로 항상 ok다(타입 좁히기용).
    if (!total.ok) return;
    await onSubmit({
      totalAmount: total.value,
      paymentGuide: values.paymentGuide.trim(),
      hostIncluded: values.hostIncluded,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>총액 (원)</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11 tabular-nums"
                  inputMode="numeric"
                  enterKeyHint="next"
                  placeholder="예: 50000"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                원 단위 숫자만 입력해요. 쉼표는 넣어도 괜찮아요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {targetPicker}

        <FormField
          control={form.control}
          name="hostIncluded"
          render={({ field }) => (
            <FormItem className="gap-0 rounded-md border">
              <FormLabel className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 leading-normal font-normal">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">주최자 본인도 나눠 내기</span>
                  <span className="text-xs text-muted-foreground">
                    체크하면 본인도 인원에 넣어 1/N을 계산해요.
                  </span>
                </span>
              </FormLabel>
            </FormItem>
          )}
        />

        {/* 1인 금액 미리보기. 총액·대상·본인 포함을 바꾸면 즉시 다시 계산된다(U4-4). */}
        <div role="status" aria-live="polite">
          {preview?.ok && (
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">1인 금액 미리보기</p>
              <p className="text-xl font-bold wrap-break-word tabular-nums">
                {formatWon(preview.value.perPersonAmount)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  × {preview.value.headCount}명
                  {preview.value.hostIncluded && " (주최자 포함)"}
                </span>
              </p>
              {preview.value.hostRemainder > 0 && (
                <p className="text-sm text-muted-foreground">
                  나누어떨어지지 않는 {formatWon(preview.value.hostRemainder)}은
                  주최자가 부담해요.
                </p>
              )}
            </div>
          )}
          {preview && !preview.ok && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/50 p-3 text-sm font-medium text-destructive">
              <TriangleAlertIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              {preview.message}
            </p>
          )}
          {!preview && (
            <p className="text-sm text-muted-foreground">
              총액을 입력하면 1인 금액을 바로 계산해 보여드려요.
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="paymentGuide"
          render={({ field }) => (
            <FormItem>
              <FormLabel>입금 안내</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-20"
                  placeholder="예: OO은행 123-456-7890 홍길동"
                  maxLength={PAYMENT_GUIDE_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                계좌번호와 예금주를 적어 주세요. 정산 링크와 안내 문구에 그대로
                보여요. ({field.value.length}/{PAYMENT_GUIDE_MAX_LENGTH}자)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={onCancel}
            >
              취소
            </Button>
          )}
          <Button
            type="submit"
            className="min-h-11 flex-1"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2Icon className="animate-spin" aria-hidden />
            )}
            {form.formState.isSubmitting ? "저장 중..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
