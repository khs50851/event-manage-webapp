import { AvatarUploader } from "@/components/me/avatar-uploader";
import { formatDate } from "@/lib/format";

interface ProfileCardProps {
  name: string;
  email: string;
  // 가입일 "YYYY-MM-DD"
  joinedAt: string;
  // 프로필 사진 URL. 없으면 이니셜 원을 보여준다.
  avatarUrl: string | null;
}

// 내 정보: 프로필 카드. 사진 변경·삭제만 클라이언트 컴포넌트(AvatarUploader)가 맡고,
// 이름·이메일·가입일은 서버에서 렌더링해 children으로 넘긴다.
export function ProfileCard({
  name,
  email,
  joinedAt,
  avatarUrl,
}: ProfileCardProps) {
  return (
    <section aria-label="프로필" className="rounded-md border p-4">
      <AvatarUploader name={name} avatarUrl={avatarUrl}>
        <p className="truncate text-lg font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground" title={email}>
          {email}
        </p>
        <p className="text-xs text-muted-foreground">
          가입일 {formatDate(joinedAt)}
        </p>
      </AvatarUploader>
    </section>
  );
}
