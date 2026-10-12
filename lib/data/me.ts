import { createAvatarSignedUrl } from "@/lib/data/avatars";
import { toKstDateString } from "@/lib/format";
import { mockMemberships, mockProfile } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import type { MyStats, Profile } from "@/lib/types/domain";

// 내 정보 조회 함수. getMyProfile은 세션이 있으면 Supabase(profiles)를 조회하고,
// 세션이 없으면(개발 환경 목업 미리보기) 더미를 반환한다. getMyStats는 아직 더미다(연동 단계 I1에서 교체).
// 세션 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다(cacheComponents).
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연(더미 경로에만 적용).
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// 표시 이름 최대 길이(profiles.display_name 제약과 동일)
const DISPLAY_NAME_MAX = 30;

type ProfileRow = {
  display_name: string;
  avatar_path: string | null;
  created_at: string;
};

// 문자열 메타데이터 값만 꺼낸다(공백뿐이면 무시).
function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// profiles 행이 없을 때의 대체 이름: 메타데이터 full_name → name → 이메일 앞부분 → "사용자"
// (가입 트리거와 같은 규칙, docs/guides/db-schema.md I0-8)
function fallbackDisplayName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
): string {
  const name =
    pickString(metadata?.full_name) ??
    pickString(metadata?.name) ??
    pickString(email?.split("@")[0]) ??
    "사용자";
  return name.slice(0, DISPLAY_NAME_MAX);
}

// 내 프로필
export async function getMyProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  // 세션 없음: 개발 환경 목업 미리보기용 더미(운영에서는 페이지가 로그인으로 리다이렉트한다)
  if (!claims) {
    await delay();
    return mockProfile;
  }

  const userId = claims.sub;
  const email = claims.email ?? "";

  // RLS로 본인 행만 조회된다. 오류여도 화면은 대체 값으로 보여준다.
  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, avatar_path, created_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (row) {
    return {
      id: userId,
      name: row.display_name,
      email,
      joinedAt: toKstDateString(row.created_at) ?? "",
      avatarUrl: await createAvatarSignedUrl(supabase, row.avatar_path),
    };
  }

  // 가입 트리거 실패 등으로 profiles 행이 없는 경우: Auth 정보로 대체한다.
  // 가입일(created_at)은 JWT 클레임에 없으므로 Auth 서버에서 사용자 정보를 가져온다.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  return {
    id: userId,
    name: fallbackDisplayName(
      user?.user_metadata ?? claims.user_metadata,
      email || user?.email,
    ),
    email,
    joinedAt: (user?.created_at && toKstDateString(user.created_at)) ?? "",
    avatarUrl: null,
  };
}

// 내가 만든 모임 수 / 참여한 모임 수
export async function getMyStats(): Promise<MyStats> {
  await delay();
  const mine = mockMemberships.filter((item) => item.userId === mockProfile.id);
  return {
    hostedCount: mine.filter((item) => item.role === "host").length,
    joinedCount: mine.filter((item) => item.role === "member").length,
  };
}
