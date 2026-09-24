import {
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_MAX_DIMENSION,
} from "@shared/thumbnail";
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_DIMENSION,
  UPLOAD_TARGET_BYTES,
} from "@shared/imageLimits";

const START_QUALITY = 0.82;
const MIN_QUALITY = 0.6;
const QUALITY_STEP = 0.06;
/** 품질을 낮춰도 크면 이 크기까지만 더 줄인다. */
const MIN_SHRINK_DIMENSION = 1200;

type CompressOptions = {
  maxBytes?: number;
  maxDimension?: number;
};

export type CompressedImage = {
  dataUrl: string;
  fileName: string;
  compressed: boolean;
  originalBytes: number;
  outputBytes: number;
};

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("이미지를 읽을 수 없습니다."));
    };
    reader.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 열 수 없습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 압축할 수 없습니다."));
      },
      type,
      quality
    );
  });
}

function replaceExtension(fileName: string, ext: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base || "image"}.${ext}`;
}

/**
 * 올리기 전에 사진을 줄인다 (2026-09-24, shared/imageLimits.ts).
 *
 * 파일 크기와 상관없이 긴 변 2048px, 1MB 안팎의 JPEG 로 만든다. 이미 작은
 * JPEG(2048px·1MB 이하)만 그대로 둔다. 서버는 이보다 큰 사진을 받지 않는다.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const targetBytes = options.maxBytes ?? UPLOAD_TARGET_BYTES;
  const maxDimension = options.maxDimension ?? UPLOAD_MAX_DIMENSION;

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const image = await loadImage(file);
  const longSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (
    file.type === "image/jpeg" &&
    file.size <= targetBytes &&
    longSide <= maxDimension
  ) {
    return {
      dataUrl: await readBlobAsDataUrl(file),
      fileName: file.name,
      compressed: false,
      originalBytes: file.size,
      outputBytes: file.size,
    };
  }

  const draw = (limit: number) => {
    const scale = Math.min(1, limit / longSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 압축을 준비할 수 없습니다.");
    // 투명한 PNG 가 JPEG 에서 검게 나오지 않도록 흰 바탕을 먼저 깐다.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  };

  let limit = Math.min(maxDimension, longSide);
  let canvas = draw(limit);
  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  while (blob.size > targetBytes && limit > MIN_SHRINK_DIMENSION) {
    limit = Math.max(MIN_SHRINK_DIMENSION, Math.round(limit * 0.85));
    canvas = draw(limit);
    blob = await canvasToBlob(canvas, "image/jpeg", 0.78);
  }
  if (blob.size > UPLOAD_MAX_BYTES) {
    throw new Error(
      "사진을 충분히 줄이지 못했습니다. 다른 사진으로 올려 주세요."
    );
  }

  return {
    dataUrl: await readBlobAsDataUrl(blob),
    fileName: replaceExtension(file.name, "jpg"),
    compressed: true,
    originalBytes: file.size,
    outputBytes: blob.size,
  };
}

/**
 * 사진첩 격자에 쓸 작은 사진(긴 변 800px JPEG)을 만든다 (2026-09-19,
 * shared/thumbnail.ts). 만들지 못하면 undefined — 올리기는 그대로 하고 화면은
 * 원본을 쓴다. 올리는 사진도 2048px 로 줄이지만(2026-09-24), 격자에는 800px
 * 작은 사진이 훨씬 가볍다.
 */
export async function makeThumbnailDataUrl(
  file: File
): Promise<string | undefined> {
  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      THUMBNAIL_MAX_DIMENSION /
        Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    // 투명한 PNG 가 JPEG 에서 검게 나오지 않도록 흰 바탕을 먼저 깐다.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob.size > THUMBNAIL_MAX_BYTES * 0.9 && quality > 0.5) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (blob.type !== "image/jpeg" || blob.size > THUMBNAIL_MAX_BYTES) {
      return undefined;
    }
    return await readBlobAsDataUrl(blob);
  } catch {
    return undefined;
  }
}
