import { Badge } from "@/components/ui/badge";

export function EnvVarWarning() {
  return (
    <Badge variant="outline" className="font-normal">
      Supabase の環境変数が必要です
    </Badge>
  );
}
