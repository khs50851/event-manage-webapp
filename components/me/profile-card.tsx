import { formatDate } from "@/lib/format";

interface ProfileCardProps {
  name: string;
  email: string;
  // 가입일 "YYYY-MM-DD"
  joinedAt: string;
}

// 이름의 첫 글자(이모지 등 서로게이트 문자도 한 글자로 취급)
function getInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "?";
}

// 내 정보: 프로필 카드(표시 전용 서버 컴포넌트)
export function ProfileCard({ name, email, joinedAt }: ProfileCardProps) {
  return (
    <section
      aria-label="프로필"
      className="flex items-center gap-4 rounded-md border p-4"
    >
      {/* 이름이 바로 옆에 텍스트로 있으므로 아바타는 장식으로 처리한다 */}
      <div
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
      >
        {getInitial(name)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-lg font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground" title={email}>
          {email}
        </p>
        <p className="text-xs text-muted-foreground">
          가입일 {formatDate(joinedAt)}
        </p>
      </div>
    </section>
  );
}
