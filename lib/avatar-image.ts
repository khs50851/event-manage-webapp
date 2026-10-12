import sharp, { type Metadata, type SharpOptions } from "sharp";

import { AVATAR_OUTPUT_SIZE, type AvatarMimeType } from "@/lib/schemas/profile";

// 프로필 사진 서버 측 검증·재인코딩(서버 전용, sharp 사용).
// Server Action(app/actions/profile.ts)에서만 호출한다. 브라우저 번들에 넣지 않는다.

// 디컴프레션 폭탄 방어: 디코딩 전 헤더의 가로x세로가 이 값을 넘으면 처리하지 않는다.
// 2,500만 픽셀(약 5000x5000). 3MB 이하 파일이라도 단색 PNG 등은 수억 픽셀로 부풀 수 있다.
// 브라우저가 업로드 전에 축소하므로 일반 사진은 이 한도에 걸리지 않는다.
export const AVATAR_MAX_INPUT_PIXELS = 25_000_000;

// 재인코딩 WebP 품질
export const AVATAR_WEBP_QUALITY = 80;

// sharp 메타데이터의 format 값과 MIME의 대응
const SHARP_FORMAT_BY_MIME: Record<AvatarMimeType, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

// 파일 앞부분(매직 바이트)으로 실제 형식을 판별한다. 확장자·Content-Type은 신뢰하지 않는다.
// 허용 형식이 아니면 null.
export function detectImageType(bytes: Uint8Array): AvatarMimeType | null {
  const startsWith = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length &&
    signature.every((value, index) => bytes[offset + index] === value);

  // JPEG: FF D8 FF
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // WebP: "RIFF" + 4바이트 크기 + "WEBP"
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    startsWith([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

// 처리 실패 사유. 사용자 메시지 매핑은 호출자(Server Action)가 한다.
export type AvatarImageErrorCode = "unsupported" | "too_large" | "invalid";

export class AvatarImageError extends Error {
  constructor(readonly code: AvatarImageErrorCode) {
    super(code);
    this.name = "AvatarImageError";
  }
}

// sharp 입력 옵션(신뢰할 수 없는 입력 기준)
const SHARP_INPUT_OPTIONS: SharpOptions = {
  // 헤더 기준 픽셀 수 제한(디컴프레션 폭탄 방어)
  limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
  // 손상·잘린 데이터는 경고 단계부터 중단(sharp 문서의 신뢰할 수 없는 입력 권장값)
  failOn: "warning",
  // 애니메이션 WebP 등은 첫 프레임만 읽는다
  animated: false,
  pages: 1,
};

// 업로드 이미지를 검증하고 512x512 WebP로 재인코딩한다.
// - 매직 바이트 형식과 sharp가 해석한 형식이 일치해야 한다(형식 위장 차단).
// - rotate(): EXIF Orientation을 픽셀에 반영한다(재인코딩 후 메타데이터가 사라져도 방향 유지).
// - 출력에 메타데이터(EXIF·GPS·ICC 등)를 넣지 않는다(sharp 기본값: withMetadata/keepMetadata 미호출).
export async function processAvatarImage(input: Buffer): Promise<Buffer> {
  const detected = detectImageType(input);
  if (!detected) throw new AvatarImageError("unsupported");

  let metadata: Metadata;
  try {
    // metadata()는 헤더만 읽고 픽셀을 디코딩하지 않으므로 픽셀 제한을 풀고 크기를 직접 비교한다
    // (제한을 걸면 초과 이미지가 "해상도 초과"가 아닌 일반 오류로 분류된다).
    metadata = await sharp(input, {
      ...SHARP_INPUT_OPTIONS,
      limitInputPixels: false,
    }).metadata();
  } catch {
    throw new AvatarImageError("invalid");
  }

  if (metadata.format !== SHARP_FORMAT_BY_MIME[detected]) {
    throw new AvatarImageError("unsupported");
  }
  const { width, height } = metadata;
  if (!width || !height) throw new AvatarImageError("invalid");
  if (width * height > AVATAR_MAX_INPUT_PIXELS) {
    throw new AvatarImageError("too_large");
  }

  try {
    return await sharp(input, SHARP_INPUT_OPTIONS)
      .rotate()
      .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: AVATAR_WEBP_QUALITY })
      .toBuffer();
  } catch {
    // limitInputPixels 초과도 여기서 예외로 온다(위 사전 검사를 통과한 경우의 방어선)
    throw new AvatarImageError("invalid");
  }
}
