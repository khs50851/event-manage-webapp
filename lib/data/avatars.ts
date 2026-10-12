import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/schemas/profile";

// 프로필 사진 서명 URL 헬퍼(서버 전용).
// avatars 버킷은 비공개라 화면용 URL은 서버가 짧은 만료의 서명 URL로 만든다.
// 서명 시 Storage RLS가 그대로 적용되므로(본인 폴더 / 주최자-응답자 관계) 권한 없는 경로는 URL이 생성되지 않는다.
// Supabase 클라이언트는 호출자가 요청마다 새로 만든 것을 넘겨받는다(전역 보관 금지).

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

// 서명 URL 만료(초). 페이지를 오래 열어 두면 만료될 수 있으나, 재방문·새로고침 시 다시 발급된다.
export const AVATAR_SIGNED_URL_EXPIRES_IN = 60 * 60;

// 경로 1건의 서명 URL. 실패하면 null(사진 없음으로 처리해 화면은 기본 아바타를 보여준다).
export async function createAvatarSignedUrl(
  supabase: ServerSupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_EXPIRES_IN);
  if (error || !data) return null;
  return data.signedUrl;
}

// 여러 경로의 서명 URL을 한 번의 요청으로 만든다. 반환: 경로 → URL(실패한 경로는 빠진다).
export async function createAvatarSignedUrls(
  supabase: ServerSupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(unique, AVATAR_SIGNED_URL_EXPIRES_IN);
  if (error || !data) return result;

  for (const item of data) {
    if (!item.error && item.path && item.signedUrl) {
      result.set(item.path, item.signedUrl);
    }
  }
  return result;
}
