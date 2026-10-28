"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createGroup, createOneOffEvent } from "@/app/actions/groups";
import {
  type FormSubmitOutcome,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
} from "@/components/groups/action-feedback";
import { EventForm } from "@/components/groups/event-form";
import { GroupForm } from "@/components/groups/group-form";
import { Button } from "@/components/ui/button";
import type { EventFormValues } from "@/lib/schemas/event";
import type { GroupFormValues } from "@/lib/schemas/group";
import type { ActionResult } from "@/lib/types/action";

type Mode = "recurring" | "one-off";

const MODES: ReadonlyArray<readonly [Mode, string]> = [
  ["recurring", "定期グループ"],
  ["one-off", "単発イベント"],
];

export function NewGroupPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("recurring");
  // cacheComponents로 이 화면의 상태가 유지되므로, 저장 후 key를 바꿔 다음 진입 때 빈 폼으로 시작한다.
  const [formKey, setFormKey] = useState(0);

  function resetForm() {
    setFormKey((key) => key + 1);
    setMode("recurring");
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션(실제로 저장하지 않음)
  function simulateFinish() {
    toast.success("保存しました。(ダミー:入力内容は実際には保存されません)");
    resetForm();
    router.push("/protected");
  }

  // 생성 결과 공통 처리: 성공하면 홈(모임 목록)으로 이동한다.
  async function handleCreate(
    run: () => Promise<ActionResult<{ groupId: string }>>,
  ): Promise<FormSubmitOutcome> {
    try {
      const result = await run();
      if (result.ok) {
        toast.success("保存しました。");
        resetForm();
        router.push("/protected");
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateFinish();
        return;
      }
      return reportActionFailure(result);
    } catch (error) {
      reportActionException(error);
    }
  }

  function submitGroup(values: GroupFormValues) {
    return handleCreate(() => createGroup(values));
  }

  function submitOneOff(values: EventFormValues) {
    return handleCreate(() => createOneOffEvent(values));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="種類">
        {MODES.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={mode === value ? "default" : "outline"}
            aria-pressed={mode === value}
            className="min-h-11"
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {mode === "recurring" ? (
        <GroupForm
          key={formKey}
          submitLabel="グループを作成"
          onSubmit={submitGroup}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            メンバー登録なしで、開催回を1つすぐに作成します。
          </p>
          <EventForm
            key={formKey}
            submitLabel="イベントを作成"
            onSubmit={submitOneOff}
          />
        </div>
      )}
    </div>
  );
}
