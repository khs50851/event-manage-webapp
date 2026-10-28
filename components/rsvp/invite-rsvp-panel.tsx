"use client";

import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, useState } from "react";

import { submitRsvp } from "@/app/actions/invites";
import {
  type FormSubmitOutcome,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
  upsertById,
} from "@/components/groups/action-feedback";
import { InviteNotice } from "@/components/rsvp/invite-notice";
import { PublicRsvpList } from "@/components/rsvp/public-rsvp-list";
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, nowKstLocalString } from "@/lib/format";
import {
  labelDuplicateNames,
  RSVP_STATUS_LABEL,
  summarizeRsvps,
} from "@/lib/rsvp";
import { DIRECT_INPUT, type RsvpFormValues } from "@/lib/schemas/rsvp";
import type { PublicMember, Rsvp, RsvpRejectReason } from "@/lib/types/domain";

const OVER_CAPACITY_MESSAGE = "定員を超えています。主催者が確認します";

type BlockedNotice = {
  kind: ComponentProps<typeof InviteNotice>["kind"];
  title: string;
  // 서버가 돌려준 사유별 안내 문구
  message: string;
};

// 제출하는 사이 링크·회차 상태가 바뀌어 더 이상 응답할 수 없는 사유와 안내 제목
const BLOCKING_NOTICE: Partial<
  Record<RsvpRejectReason, Omit<BlockedNotice, "message">>
> = {
  invalid: { kind: "invalid", title: "無効なリンクです" },
  expired: { kind: "expired", title: "有効期限切れのリンクです" },
  cancelled: { kind: "cancelled", title: "中止された開催回です" },
  ended: { kind: "closed", title: "終了した開催回です" },
  deadline: { kind: "closed", title: "回答は締め切られました" },
};

// 비회원·참가자 RSVP 영역(FR-06). 제출·수정은 submitRsvp Server Action으로 저장한다.
// - 같은 응답자(로그인=계정, 비로그인=이 기기의 응답자 키 쿠키)는 기존 응답을 수정한다. 서버가 찾은 내 응답(initialMyRsvp)이 있으면 완료 상태로 시작한다.
// - 정원 초과 여부는 서버 응답(overCapacity)을 쓴다(접수는 됨, Q3).
// - useState 초기값은 서버 재렌더에 반응하지 않으므로, 제출 후 상태는 액션 반환값으로 갱신한다.
// - 개발 환경 더미 토큰(demo-*)은 저장하지 않고 화면 상태로만 시뮬레이션한다(isDevPreviewFallback).
export function InviteRsvpPanel({
  token,
  eventId,
  capacity,
  members,
  initialRsvps,
  initialMyRsvp,
}: {
  token: string;
  eventId: string;
  capacity: number | null;
  members: PublicMember[];
  initialRsvps: Rsvp[];
  initialMyRsvp: Rsvp | null;
}) {
  const router = useRouter();
  const [rsvps, setRsvps] = useState(() =>
    initialMyRsvp ? upsertById(initialRsvps, initialMyRsvp) : initialRsvps,
  );
  const [myRsvpId, setMyRsvpId] = useState<string | null>(
    initialMyRsvp?.id ?? null,
  );
  const [mode, setMode] = useState<"form" | "done">(
    initialMyRsvp ? "done" : "form",
  );
  const [overCapacity, setOverCapacity] = useState(false);
  const [blocked, setBlocked] = useState<BlockedNotice | null>(null);

  const myRsvp = rsvps.find((item) => item.id === myRsvpId) ?? null;
  const memberOptions = labelDuplicateNames(members);
  const summary = summarizeRsvps(rsvps, capacity);
  // 정원이 이미 찼으면 제출 전에 미리 알린다(거부하지 않음, Q3).
  const isFull = capacity !== null && summary.attending.length >= capacity;

  // 개발 미리보기(demo-* 토큰) 폴백: 저장 없이 화면 상태로만 시뮬레이션한다.
  function simulateSubmit(values: RsvpFormValues) {
    const fields = {
      memberId: values.memberId === DIRECT_INPUT ? null : values.memberId,
      name: values.name.trim(),
      status: values.status,
      respondedAt: nowKstLocalString(),
    };

    const next = myRsvp
      ? rsvps.map((item) =>
          item.id === myRsvp.id
            ? { ...item, ...fields, source: "self" as const }
            : item,
        )
      : [
          ...rsvps,
          {
            id: `r-${crypto.randomUUID()}`,
            eventId,
            source: "self" as const,
            ...fields,
          },
        ];

    if (!myRsvp) setMyRsvpId(next[next.length - 1].id);
    setRsvps(next);
    setOverCapacity(
      values.status === "attending" &&
        summarizeRsvps(next, capacity).overflow > 0,
    );
    setMode("done");
  }

  // await 동안 폼의 isSubmitting이 유지돼 버튼이 비활성화된다. 실패하면 입력값을 그대로 둔다.
  async function handleSubmit(
    values: RsvpFormValues,
  ): Promise<FormSubmitOutcome> {
    try {
      const result = await submitRsvp(token, values);
      if (result.ok) {
        const saved = result.data.rsvp;
        setRsvps((current) => upsertById(current, saved));
        setMyRsvpId(saved.id);
        setOverCapacity(result.data.overCapacity);
        setMode("done");
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateSubmit(values);
        return;
      }
      // 링크 만료·회차 취소·마감 등은 다시 제출해도 소용없으므로 폼 대신 안내를 보여준다.
      const notice = BLOCKING_NOTICE[result.reason];
      if (notice) {
        setBlocked({ ...notice, message: result.message });
        return;
      }
      // 속도 제한·경합·저장 실패는 토스트로 알리고 폼을 유지해 다시 시도할 수 있게 한다.
      return reportActionFailure(result);
    } catch (error) {
      reportActionException(error);
    }
  }

  function renderMain() {
    if (blocked) {
      return (
        <div className="flex flex-col gap-3">
          <InviteNotice kind={blocked.kind} title={blocked.title}>
            {blocked.message}
          </InviteNotice>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 self-start"
            onClick={() => router.refresh()}
          >
            最新の情報を再読み込み
          </Button>
        </div>
      );
    }

    if (mode === "done" && myRsvp) {
      return (
        <Card role="status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleCheckIcon className="size-5 text-primary" />
              回答を受け付けました
            </CardTitle>
            <CardDescription>
              {myRsvp.name}さん · {RSVP_STATUS_LABEL[myRsvp.status]} (
              {formatDateTime(myRsvp.respondedAt)})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {overCapacity && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {OVER_CAPACITY_MESSAGE}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              この端末で再度開くと、回答を編集できます。
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setMode("form")}
            >
              回答を編集する
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <section
        aria-labelledby="rsvp-form-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="rsvp-form-heading" className="text-lg font-semibold">
          {myRsvp ? "自分の回答を編集" : "出欠を回答"}
        </h2>
        {myRsvp && (
          <p className="rounded-md border bg-muted p-3 text-sm">
            この端末ですでに回答済みです。前回の回答:{" "}
            <strong>
              {myRsvp.name} · {RSVP_STATUS_LABEL[myRsvp.status]}
            </strong>
          </p>
        )}
        {isFull && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            定員に達しています。参加と回答しても受け付けられ、主催者が確認します。
          </p>
        )}
        <RsvpForm
          // 수정 모드에 들어갈 때 이전 응답으로 폼을 새로 만든다.
          key={myRsvp ? `edit-${myRsvp.id}-${myRsvp.respondedAt}` : "new"}
          memberOptions={memberOptions}
          defaultValues={
            myRsvp
              ? {
                  // 명부에서 삭제된 멤버로 응답했으면 직접 입력으로 이어 쓴다.
                  memberId:
                    myRsvp.memberId &&
                    members.some((member) => member.id === myRsvp.memberId)
                      ? myRsvp.memberId
                      : DIRECT_INPUT,
                  name: myRsvp.name,
                  status: myRsvp.status,
                }
              : undefined
          }
          submitLabel={myRsvp ? "回答を編集" : "回答を送信"}
          onSubmit={handleSubmit}
        />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {renderMain()}
      <PublicRsvpList rsvps={rsvps} capacity={capacity} myRsvpId={myRsvpId} />
    </div>
  );
}
