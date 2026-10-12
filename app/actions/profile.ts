"use server";

import { revalidatePath } from "next/cache";

import { AvatarImageError, processAvatarImage } from "@/lib/avatar-image";
import { createAvatarSignedUrl } from "@/lib/data/avatars";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarFileMetaSchema,
} from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";

// 프로필 사진 변경·삭제 Server Action.
// Server Action은 UI 밖에서도 POST로 호출될 수 있으므로 세션·입력을 모두 여기서 다시 검증한다.
// 접근 제어의 최종 방어선은 DB/Storage RLS다(profiles 본인 행, avatars 본인 폴더).
// 실패 메시지는 사용자용 문구만 돌려주고 내부 오류·경로·키는 노출하지 않는다.

export type AvatarActionResult =
  { ok: true; avatarUrl: string | null } | { ok: false; message: string };

// 사진을 보여주는 화면. 이 경로들은 캐시하지 않는 동적 페이지지만,
// Server Action에서 revalidatePath를 호출하면 현재 보고 있는 화면이 새 데이터로 즉시 갱신된다.
const AVATAR_PATHS_TO_REVALIDATE = ["/protected/me"];

const MESSAGES = {
  unauthenticated: "로그인이 필요해요.",
  noFile: "올릴 사진을 선택해 주세요.",
  tooLarge: "사진은 3MB 이하만 올릴 수 있어요.",
  unsupported: "JPG, PNG, WebP 사진만 올릴 수 있어요.",
  tooManyPixels:
    "사진 해상도가 너무 커요. 더 작은 사진으로 다시 시도해 주세요.",
  invalidImage: "사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.",
  uploadFailed: "사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  removeFailed: "사진을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

function fail(message: string): AvatarActionResult {
  return { ok: false, message };
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

// 세션 사용자 id(JWT sub). 없으면 null.
async function getSessionUserId(
  supabase: ServerSupabaseClient,
): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

// 본인 profiles 행의 현재 사진 경로. 행이 없거나 조회 실패면 undefined.
async function getCurrentAvatarPath(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<string | null | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return undefined;
  return data.avatar_path;
}

// 이전 사진 파일 삭제. 본인 폴더 경로만 대상으로 하며 실패해도 무시한다(고아 파일만 남음).
async function removeAvatarFileQuietly(
  supabase: ServerSupabaseClient,
  userId: string,
  path: string | null | undefined,
) {
  if (!path || !path.startsWith(`${userId}/`)) return;
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  } catch {
    // 삭제 실패는 사용자 동작 결과에 영향을 주지 않는다
  }
}

function revalidateAvatarPaths() {
  for (const path of AVATAR_PATHS_TO_REVALIDATE) revalidatePath(path);
}

// 프로필 사진 변경. FormData 필드명: file
export async function updateAvatar(
  formData: FormData,
): Promise<AvatarActionResult> {
  // 1. 세션 확인(서버 클라이언트는 호출마다 새로 만든다)
  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return fail(MESSAGES.unauthenticated);

  // 2. 입력 형태·크기·선언 MIME 검증(직접 POST로 FormData가 아닌 값이 올 수도 있다)
  if (!(formData instanceof FormData)) return fail(MESSAGES.noFile);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(MESSAGES.noFile);

  const meta = avatarFileMetaSchema.safeParse({
    size: file.size,
    type: file.type,
  });
  if (!meta.success) {
    return fail(
      file.size > AVATAR_MAX_BYTES ? MESSAGES.tooLarge : MESSAGES.unsupported,
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  // 선언된 size와 실제 바이트 수가 다를 수 있으므로 실제 길이로 다시 확인한다
  if (input.byteLength === 0) return fail(MESSAGES.noFile);
  if (input.byteLength > AVATAR_MAX_BYTES) return fail(MESSAGES.tooLarge);

  // 3. 매직 바이트 형식 확인 + 512x512 WebP 재인코딩(EXIF 회전 반영, 메타데이터 제거)
  let output: Buffer;
  try {
    output = await processAvatarImage(input);
  } catch (error) {
    if (error instanceof AvatarImageError) {
      if (error.code === "unsupported") return fail(MESSAGES.unsupported);
      if (error.code === "too_large") return fail(MESSAGES.tooManyPixels);
    }
    return fail(MESSAGES.invalidImage);
  }

  // 4. 이전 경로 확인(프로필 행이 없으면 avatar_path를 저장할 곳이 없으므로 업로드하지 않는다)
  const previousPath = await getCurrentAvatarPath(supabase, userId);
  if (previousPath === undefined) return fail(MESSAGES.uploadFailed);

  // 5. 새 파일 업로드. 파일명을 매번 새로 만들어 덮어쓰기(update 정책)가 필요 없다.
  const newPath = `${userId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(newPath, output, {
      contentType: "image/webp",
      upsert: false,
    });
  if (uploadError) {
    console.error("[updateAvatar] 업로드 실패:", uploadError.name);
    return fail(MESSAGES.uploadFailed);
  }

  // 6. profiles.avatar_path 갱신. 영향 행이 없으면(RLS 등) 실패로 보고 방금 올린 파일을 지운다.
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: newPath })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    console.error("[updateAvatar] 프로필 갱신 실패:", updateError?.code);
    await removeAvatarFileQuietly(supabase, userId, newPath);
    return fail(MESSAGES.uploadFailed);
  }

  // 7. 이전 파일 삭제(실패해도 무시)
  if (previousPath !== newPath) {
    await removeAvatarFileQuietly(supabase, userId, previousPath);
  }

  revalidateAvatarPaths();
  return {
    ok: true,
    avatarUrl: await createAvatarSignedUrl(supabase, newPath),
  };
}

// 프로필 사진 삭제(기본 아바타로 되돌림)
export async function removeAvatar(): Promise<AvatarActionResult> {
  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return fail(MESSAGES.unauthenticated);

  const previousPath = await getCurrentAvatarPath(supabase, userId);
  if (previousPath === undefined) return fail(MESSAGES.removeFailed);
  // 이미 사진이 없으면 그대로 성공
  if (previousPath === null) return { ok: true, avatarUrl: null };

  // DB를 먼저 비워 화면이 깨진 경로를 가리키지 않게 한 뒤 파일을 지운다
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    console.error("[removeAvatar] 프로필 갱신 실패:", updateError?.code);
    return fail(MESSAGES.removeFailed);
  }

  await removeAvatarFileQuietly(supabase, userId, previousPath);

  revalidateAvatarPaths();
  return { ok: true, avatarUrl: null };
}
