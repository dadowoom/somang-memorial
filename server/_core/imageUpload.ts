import { TRPCError } from "@trpc/server";
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_DIMENSION,
} from "../../shared/imageLimits";
import { readImageDimensions } from "./imageDimensions";
import { detectImageFormat, stripImageMetadata } from "./imageMetadata";

/**
 * 서버에 두는 사진의 한도 (2026-09-24 사용자 결정, shared/imageLimits.ts).
 * 전에는 20MB·크기 제한 없이 받아 휴대폰 원본(4000px)이 그대로 저장됐다.
 * 브라우저가 먼저 줄이고, 여기서는 넘는 것을 받지 않는다.
 */
const MAX_IMAGE_BYTES = UPLOAD_MAX_BYTES;
const TOO_LARGE_MESSAGE =
  "사진이 너무 큽니다. 화면을 새로고침한 뒤 다시 올려 주세요. 올리실 때 자동으로 줄여서 올립니다.";
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function decodeImageDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "잘못된 이미지 형식입니다.",
    });
  }

  const mimeType = matches[1]?.toLowerCase() ?? "";
  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  if (!ext) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.",
    });
  }

  const buffer = Buffer.from(matches[2] ?? "", "base64");
  if (buffer.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "이미지 데이터가 비어 있습니다.",
    });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: TOO_LARGE_MESSAGE,
    });
  }

  // 브라우저가 "이건 사진입니다"라고 말한 것만 믿지 않고, 파일 앞부분을 직접
  // 확인합니다. 말과 내용이 다르면 받지 않습니다.
  const actualFormat = detectImageFormat(buffer);
  if (!actualFormat || ALLOWED_IMAGE_TYPES[`image/${actualFormat}`] !== ext) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "사진 파일이 아니거나 형식이 맞지 않습니다.",
    });
  }

  const size = readImageDimensions(buffer, actualFormat);
  if (size && Math.max(size.width, size.height) > UPLOAD_MAX_DIMENSION) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: TOO_LARGE_MESSAGE,
    });
  }

  // 촬영 장소·시각 같은 숨은 정보를 떼어냅니다. 그림 자체는 그대로입니다.
  return { buffer: stripImageMetadata(buffer), mimeType, ext };
}
