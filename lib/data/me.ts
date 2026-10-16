import { createAvatarSignedUrl } from "@/lib/data/avatars";
import { fetchJoinedGroups } from "@/lib/data/groups";
import { mockDelay, resolveDataSource } from "@/lib/data/source";
import { toKstDateString } from "@/lib/format";
import { mockMemberships, mockProfile } from "@/lib/mock/data";
import type { MyStats, Profile } from "@/lib/types/domain";

// 내 정보 조회 함수. 세션이 있으면 Supabase(profiles·groups, RLS)를 조회하고,
// 세션이 없으면 개발 환경 목업 미리보기용 더미를 반환한다(판단은 lib/data/source.ts).
// 세션 쿠키를 읽으므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다(cacheComponents).

// 표시 이름 최대 길이(profiles.display_name 제약과 동일)
const DISPLAY_NAME_MAX = 30;

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
  const source = await resolveDataSource();

  // 세션 없음: 개발 환경 목업 미리보기용 더미. 반환 타입이 Profile(비-null)이라 프로덕션(none)도
  // 기존처럼 더미를 돌려준다(정상 흐름에서는 페이지가 로그인으로 리다이렉트한다). I5-3에서 정리한다.
  if (source.kind !== "supabase") {
    await mockDelay();
    return mockProfile;
  }

  const { supabase, userId, claims } = source;
  const email = claims.email ?? "";

  // RLS로 본인 행만 조회된다. 오류여도 화면은 대체 값으로 보여준다.
  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, avatar_path, created_at")
    .eq("id", userId)
    .maybeSingle();

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

// 내가 만든 모임 수 / 참여한 모임 수.
// 실데이터: 만든 모임은 groups 건수(RLS로 본인 소유만, listGroups와 같은 기준),
// 참여한 모임은 listJoinedGroups와 같은 RPC(list_joined_groups) 건수다(홈·대시보드와 일치).
export async function getMyStats(): Promise<MyStats> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    const mine = mockMemberships.filter(
      (item) => item.userId === mockProfile.id,
    );
    return {
      hostedCount: mine.filter((item) => item.role === "host").length,
      joinedCount: mine.filter((item) => item.role === "member").length,
    };
  }
  if (source.kind === "none") return { hostedCount: 0, joinedCount: 0 };

  const [{ count, error }, joinedGroups] = await Promise.all([
    source.supabase.from("groups").select("id", { count: "exact", head: true }),
    fetchJoinedGroups(source.supabase),
  ]);
  if (error) {
    console.error("[getMyStats] 조회 실패:", error.code);
    throw new Error("데이터를 불러오지 못했어요.");
  }
  return { hostedCount: count ?? 0, joinedCount: joinedGroups.length };
}
