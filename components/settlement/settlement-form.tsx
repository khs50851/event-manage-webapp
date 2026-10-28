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
import { formatYen } from "@/lib/format";
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
              <FormLabel>合計金額(円)</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11 tabular-nums"
                  inputMode="numeric"
                  enterKeyHint="next"
                  placeholder="例:5000"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                円単位の数字のみ入力してください。カンマを入れても構いません。
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
                  <span className="font-medium">
                    主催者本人も割り勘に含める
                  </span>
                  <span className="text-xs text-muted-foreground">
                    チェックすると、本人も人数に含めて1/Nを計算します。
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
              <p className="text-sm text-muted-foreground">
                1人あたりの金額プレビュー
              </p>
              <p className="text-xl font-bold wrap-break-word tabular-nums">
                {formatYen(preview.value.perPersonAmount)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  × {preview.value.headCount}名
                  {preview.value.hostIncluded && " (主催者含む)"}
                </span>
              </p>
              {preview.value.hostRemainder > 0 && (
                <p className="text-sm text-muted-foreground">
                  割り切れない{formatYen(preview.value.hostRemainder)}
                  は主催者が負担します。
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
              合計金額を入力すると、1人あたりの金額をすぐに計算して表示します。
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="paymentGuide"
          render={({ field }) => (
            <FormItem>
              <FormLabel>振込案内</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-20"
                  placeholder="例:OO銀行 123-456-7890 山田太郎"
                  maxLength={PAYMENT_GUIDE_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                口座番号と口座名義を記入してください。精算リンクと案内文にそのまま表示されます。(
                {field.value.length}/{PAYMENT_GUIDE_MAX_LENGTH}文字)
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
              キャンセル
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
            {form.formState.isSubmitting ? "保存中..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
