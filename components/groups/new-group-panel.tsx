"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EventForm } from "@/components/groups/event-form";
import { GroupForm } from "@/components/groups/group-form";
import { Button } from "@/components/ui/button";

type Mode = "recurring" | "one-off";

// 더미 저장 후 이동할 모임 (실제로 저장하지 않으므로 빈 모임 더미 상세로 보낸다)
const DUMMY_CREATED_GROUP_ID = "g-empty";

const MODES: ReadonlyArray<readonly [Mode, string]> = [
  ["recurring", "정기 모임"],
  ["one-off", "1회성 이벤트"],
];

export function NewGroupPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("recurring");

  function finish() {
    toast.success("저장되었습니다. (더미: 입력값은 실제로 저장되지 않습니다)");
    router.push(`/protected/groups/${DUMMY_CREATED_GROUP_ID}`);
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
        <GroupForm submitLabel="모임 만들기" onSubmit={finish} />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            멤버 등록 없이 회차 1개를 바로 만듭니다.
          </p>
          <EventForm submitLabel="이벤트 만들기" onSubmit={finish} />
        </div>
      )}
    </div>
  );
}
