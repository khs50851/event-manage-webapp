"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";

import { deleteGroup, updateGroup } from "@/app/actions/groups";
import {
  type FormSubmitOutcome,
  isDevPreviewFallback,
  reportActionException,
  reportActionFailure,
} from "@/components/groups/action-feedback";
import { ConfirmActionDialog } from "@/components/groups/confirm-action-dialog";
import { EventList } from "@/components/groups/event-list";
import { GroupForm } from "@/components/groups/group-form";
import { MemberRoster } from "@/components/groups/member-roster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroupFormValues } from "@/lib/schemas/group";
import type { Group, GroupEvent, GroupMember } from "@/lib/types/domain";

// 서버에서 받은 모임·회차·멤버를 화면 상태로 보관한다.
// 쓰기는 Server Action으로 저장하고, 반환된 서버 데이터로 즉시 반영한다. 액션의 revalidatePath로
// 서버 컴포넌트가 다시 렌더링돼 props가 바뀌면 화면 상태를 새 props로 다시 맞춘다(클라이언트 상태는 재렌더 후에도 유지되므로).
// 비로그인 개발 미리보기에서는 기존처럼 화면 상태로만 시뮬레이션한다(새로고침 시 초기화).
export function GroupDetail({
  now,
  initialGroup,
  initialEvents,
  initialMembers,
}: {
  // 서버 요청 시점의 KST 시각("YYYY-MM-DDTHH:mm"). 회차 상태 배지 판정용
  now: string;
  initialGroup: Group;
  initialEvents: GroupEvent[];
  initialMembers: GroupMember[];
}) {
  const router = useRouter();
  const [group, setGroup] = useState(initialGroup);
  const [events, setEvents] = useState(initialEvents);
  const [members, setMembers] = useState(initialMembers);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  // 서버 props가 새로 오면(재검증 재렌더) 화면 상태를 서버 데이터로 맞춘다.
  // 렌더 중 이전 props와 비교해 갱신하는 React 권장 패턴(effect 없이 한 번에 반영)
  const [syncedProps, setSyncedProps] = useState({
    initialGroup,
    initialEvents,
    initialMembers,
  });
  if (
    syncedProps.initialGroup !== initialGroup ||
    syncedProps.initialEvents !== initialEvents ||
    syncedProps.initialMembers !== initialMembers
  ) {
    setSyncedProps({ initialGroup, initialEvents, initialMembers });
    setGroup(initialGroup);
    setEvents(initialEvents);
    setMembers(initialMembers);
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateEdit(values: GroupFormValues) {
    setGroup({
      ...group,
      name: values.name.trim(),
      description: values.description.trim(),
    });
    setEditing(false);
    toast.success("グループ情報を編集しました。");
  }

  async function handleEdit(
    values: GroupFormValues,
  ): Promise<FormSubmitOutcome> {
    try {
      const result = await updateGroup(group.id, values);
      if (result.ok) {
        setGroup(result.data.group);
        setEditing(false);
        toast.success("グループ情報を編集しました。");
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateEdit(values);
        return;
      }
      return reportActionFailure(result);
    } catch (error) {
      reportActionException(error);
    }
  }

  // 비로그인 개발 미리보기 폴백: 기존 화면 시뮬레이션
  function simulateDelete() {
    setDeleting(false);
    toast.success("グループを削除しました。(ダミー:実際には削除されません)");
    // 하단 탭바 "홈"과 같은 대시보드(/protected)로 돌아간다. 내 모임 목록도 여기에 있다
    router.push("/protected");
  }

  async function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    // 저장이 끝날 때까지 대화상자를 열어 두고(실패 시 바로 재시도), 성공하면 이동한다.
    event.preventDefault();
    if (deletePending) return;
    setDeletePending(true);
    try {
      const result = await deleteGroup(group.id);
      if (result.ok) {
        setDeleting(false);
        toast.success("グループを削除しました。");
        router.push("/protected");
        return;
      }
      if (isDevPreviewFallback(result)) {
        simulateDelete();
        return;
      }
      // 삭제 확인에는 입력 필드가 없으므로 메시지만 안내한다.
      toast.error(result.message);
    } catch (error) {
      reportActionException(error);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold wrap-break-word">{group.name}</h1>
            {group.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>
          {group.isOneOff && <Badge variant="secondary">単発</Badge>}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-4" />
            編集
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            // 다크모드 outline 배경(input/30) 위에서는 빨간 글씨 대비가 3:1에 그쳐 배경을 유지한다
            className="min-h-11 text-destructive dark:bg-background"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon className="size-4" />
            削除
          </Button>
        </div>
      </header>

      <EventList
        groupId={group.id}
        events={events}
        now={now}
        onChange={setEvents}
      />

      {/* 1회성 이벤트는 멤버 명부를 쓰지 않는다 */}
      {!group.isOneOff && (
        <MemberRoster
          groupId={group.id}
          members={members}
          onChange={setMembers}
        />
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>グループを編集</DialogTitle>
            <DialogDescription>
              名前は1〜50文字で入力してください。
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            defaultValues={{
              name: group.name,
              description: group.description,
            }}
            submitLabel="保存"
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deleting}
        onOpenChange={setDeleting}
        pending={deletePending}
        title={<>「{group.name}」を削除しますか?</>}
        description={`配下の開催回${events.length}件と、その回答・精算もまとめて削除され、元に戻せません。`}
        confirmLabel="すべて削除"
        pendingLabel="削除しています..."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
