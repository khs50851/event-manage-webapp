// 브라우저에서 사진을 축소한다(프로필 사진 업로드 전 처리). 클라이언트 컴포넌트에서만 호출한다.

export class ImageResizeError extends Error {
  constructor(
    message: string,
    // decode: 사진을 읽지 못함, encode: 변환 실패, too-large: 줄여도 용량 초과
    readonly reason: "decode" | "encode" | "too-large",
  ) {
    super(message);
    this.name = "ImageResizeError";
  }
}

type ResizeOptions = {
  // 결과 이미지의 긴 변 최대 픽셀
  maxSide: number;
  // 결과 Blob 최대 바이트
  maxBytes: number;
  // 첫 시도 품질(0~1). 용량을 넘으면 한 단계 낮춰 다시 시도한다.
  quality?: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

// EXIF 회전을 반영해 디코드한다. createImageBitmap을 우선 쓰고, 없거나 실패하면 <img>로 대체한다
// (최신 브라우저는 <img>도 기본적으로 EXIF 방향을 반영한다).
async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 아래 <img> 경로로 다시 시도한다
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageResizeError(
      "사진을 읽지 못했어요. 다른 사진을 골라 주세요.",
      "decode",
    );
  }
}

// 캔버스가 WebP 인코딩을 지원하는지 확인한다(미지원 브라우저는 JPEG로 인코딩한다)
function supportsWebp(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// 긴 변을 maxSide 이하로 줄여 WebP(미지원이면 JPEG)로 인코딩한다
export async function resizeImage(
  file: Blob,
  { maxSide, maxBytes, quality = 0.85 }: ResizeOptions,
): Promise<Blob> {
  const decoded = await decodeImage(file);
  try {
    const scale = Math.min(
      1,
      maxSide / Math.max(decoded.width, decoded.height),
    );
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageResizeError(
        "사진을 변환하지 못했어요. 다른 브라우저에서 다시 시도해 주세요.",
        "encode",
      );
    }

    const type = supportsWebp() ? "image/webp" : "image/jpeg";
    if (type === "image/jpeg") {
      // JPEG는 투명도가 없어 투명 영역이 검게 칠해지므로 흰 배경을 먼저 깐다
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, 0, 0, width, height);

    // 용량을 넘으면 품질을 낮춰 한 번 더 시도한다
    for (const q of [quality, Math.min(quality, 0.7)]) {
      const blob = await canvasToBlob(canvas, type, q);
      if (!blob) {
        throw new ImageResizeError(
          "사진을 변환하지 못했어요. 다른 사진을 골라 주세요.",
          "encode",
        );
      }
      if (blob.size <= maxBytes) return blob;
    }
    throw new ImageResizeError(
      "사진을 충분히 줄이지 못했어요. 다른 사진을 골라 주세요.",
      "too-large",
    );
  } finally {
    decoded.release();
  }
}
