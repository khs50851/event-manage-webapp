"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { labelDuplicateNames, RSVP_STATUS_LABEL } from "@/lib/rsvp";
import type { SettlementCandidate } from "@/lib/settlement";
import { cn } from "@/lib/utils";

export type CandidateLabel = { label: string; memo: string };

// 후보 키 → 표시 라벨. 동명이인은 후보 전체 기준 "이름 (순번)"으로 통일하고,
// 연락처 메모는 라벨과 분리해 주최자 화면에서만 보조 텍스트로 보여준다.
// 대상 선택기와 입금 현황이 같은 함수를 써서 같은 사람에게 같은 라벨이 붙는다.
export function labelCandidates(
  candidates: SettlementCandidate[],
): Map<string, CandidateLabel> {
  return new Map(
    labelDuplicateNames(
      candidates.map((item) => ({ ...item, id: item.key })),
    ).map((item) => [item.key, { label: item.label, memo: item.memo }]),
  );
}

// 정산 대상 선택(U4-4). 기본 대상은 "참석" 응답자이며 추가·제외할 수 있다.
// 선택 상태는 부모가 소유한다(제어 컴포넌트).
// labels: 부모가 labelCandidates(candidates)로 만든 라벨(입금 현황과 같은 값을 공유해 중복 계산을 피한다)
export function SettlementTargetPicker({
  candidates,
  labels,
  selectedKeys,
  onChange,
  disabled = false,
  className,
}: {
  candidates: SettlementCandidate[];
  labels: Map<string, CandidateLabel>;
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const selected = new Set(selectedKeys);

  function toggle(key: string, checked: boolean) {
    // 후보 목록 순서를 유지한 채 선택 키를 만든다.
    onChange(
      candidates
        .map((item) => item.key)
        .filter((candidateKey) =>
          candidateKey === key ? checked : selected.has(candidateKey),
        ),
    );
  }

  if (candidates.length === 0) {
    return (
      <p
        className={cn(
          "rounded-md border border-dashed p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        精算対象として選べる回答者やメンバーがいません。開催回の詳細で先に回答を追加してください。
      </p>
    );
  }

  return (
    <fieldset
      className={cn("flex min-w-0 flex-col", className)}
      disabled={disabled}
    >
      <legend className="mb-2 text-sm font-medium">
        精算対象 ({selected.size}名選択)
      </legend>
      <ul className="flex flex-col divide-y rounded-md border">
        {candidates.map((item) => {
          const inputId = `settlement-target-${item.key}`;
          const label = labels.get(item.key);
          return (
            <li key={item.key}>
              <label
                htmlFor={inputId}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2"
              >
                <Checkbox
                  id={inputId}
                  checked={selected.has(item.key)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    toggle(item.key, checked === true)
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="wrap-break-word">
                    {label?.label ?? item.name}
                  </span>
                  {label?.memo && (
                    <span className="text-xs wrap-break-word text-muted-foreground">
                      {label.memo}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.rsvpStatus
                    ? RSVP_STATUS_LABEL[item.rsvpStatus]
                    : // 응답·멤버가 삭제돼 기존 정산 항목에만 남은 이름
                      item.key.startsWith("share:") ||
                        item.key.startsWith("rsvp:")
                      ? "既存の対象"
                      : "未回答"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
