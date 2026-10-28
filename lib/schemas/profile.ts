import { z } from "zod";

import { personNameSchema } from "@/lib/schemas/common";

// 프로필 사진 업로드 규칙. 브라우저(UI)와 서버(Server Action)가 같은 값을 공유한다.
// 실제 방어는 서버와 Storage 버킷 설정(용량·MIME 제한)이 담당하고, 브라우저 검증은 UX 보조다.

// 서버가 받는 파일 최대 크기(버킷 file_size_limit 3,145,728바이트와 동일)
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

// 브라우저가 축소 전에 받아 주는 원본 최대 크기
export const AVATAR_MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

// 허용 MIME 형식(버킷 allowed_mime_types와 동일)
export const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_TYPES)[number];

// Storage 버킷 이름
export const AVATAR_BUCKET = "avatars";

// 서버가 재인코딩하는 정사각형 한 변 픽셀 수
export const AVATAR_OUTPUT_SIZE = 512;

// 표시 이름(profiles.display_name 제약 1~30자와 동일)
export const displayNameSchema = personNameSchema;

export const profileSchema = z.object({
  displayName: displayNameSchema,
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// 업로드 파일 메타데이터 1차 검증(크기·선언 MIME). 실제 형식은 서버에서 매직 바이트로 다시 확인한다.
export const avatarFileMetaSchema = z.object({
  size: z
    .number()
    .int()
    .positive("写真ファイルが空です。")
    .max(AVATAR_MAX_BYTES, "写真は3MB以下のみアップロードできます。"),
  type: z.enum(AVATAR_ALLOWED_TYPES, {
    error: "JPG、PNG、WebPの写真のみアップロードできます。",
  }),
});
