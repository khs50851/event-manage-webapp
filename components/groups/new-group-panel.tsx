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

// 비로그인 개발 미리보기 폴백 전용: 저장하지 않으므로 유형에 맞는 더미 상세로 보낸다.
// 정기 모임은 빈 모임, 1회성 이벤트는 명부가 숨겨진 1회성 모임. 실제 저장 경로는 새 모임 id로 이동한다.
const DUMMY_CREATED_GROUP_ID: Record<Mode, string> = {
  recurring: "g-empty",
  "one-off": "g-oneoff",
};

const MODES: ReadonlyArray<readonly [Mode, string]> = [
  ["recurring", "정기 모임"],
  ["one-off", "1회성 이벤트"],
];

export function NewGroupPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("recurring");

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션(실제로 저장하지 않음)
  function simulateFinish() {
    toast.success("저장됐어요. (더미: 입력값은 실제로 저장되지 않아요)");
    router.push(`/protected/groups/${DUMMY_CREATED_GROUP_ID[mode]}`);
  }

  // 생성 결과 공통 처리: 성공하면 새 모임 상세로 이동한다.
  async function handleCreate(
    run: () => Promise<ActionResult<{ groupId: string }>>,
  ): Promise<FormSubmitOutcome> {
    try {
      const result = await run();
      if (result.ok) {
        toast.success("저장됐어요.");
        router.push(`/protected/groups/${result.data.groupId}`);
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
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="유형">
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
        <GroupForm submitLabel="모임 만들기" onSubmit={submitGroup} />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            멤버 등록 없이 회차 1개를 바로 만들어요.
          </p>
          <EventForm submitLabel="이벤트 만들기" onSubmit={submitOneOff} />
        </div>
      )}
    </div>
  );
}
