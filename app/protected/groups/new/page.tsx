import { NewGroupPanel } from "@/components/groups/new-group-panel";

export default function NewGroupPage() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">新しいグループを作成</h1>
      <NewGroupPanel />
    </div>
  );
}
