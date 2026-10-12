"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EventList } from "@/components/groups/event-list";
import { GroupForm } from "@/components/groups/group-form";
import { MemberRoster } from "@/components/groups/member-roster";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// 서버에서 받은 더미를 초기값으로 쓰고, 이후 변경은 화면 상태로만 시뮬레이션한다(새로고침 시 초기화).
export function GroupDetail({
  initialGroup,
  initialEvents,
  initialMembers,
}: {
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

  function handleEdit(values: GroupFormValues) {
    setGroup({
      ...group,
      name: values.name.trim(),
      description: values.description.trim(),
    });
    setEditing(false);
    toast.success("모임 정보를 수정했어요.");
  }

  function confirmDelete() {
    toast.success("모임을 삭제했어요. (더미: 실제로 삭제되지 않아요)");
    // 모임 목록은 홈(/)에 있다
    router.push("/");
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
          {group.isOneOff && <Badge variant="secondary">1회성</Badge>}
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
            수정
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2Icon className="size-4" />
            삭제
          </Button>
        </div>
      </header>

      <EventList groupId={group.id} events={events} onChange={setEvents} />

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
            <DialogTitle>모임 수정</DialogTitle>
            <DialogDescription>
              이름은 1~50자로 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            defaultValues={{
              name: group.name,
              description: group.description,
            }}
            submitLabel="저장"
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              &quot;{group.name}&quot; 모임을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              하위 회차 {events.length}건과 그 응답·정산이 함께 삭제되며 되돌릴
              수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              모두 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
