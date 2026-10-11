import { Badge } from "./ui/badge";

export function EnvVarWarning() {
  return (
    <Badge variant={"outline"} className="font-normal">
      Supabase 환경 변수 필요
    </Badge>
  );
}
