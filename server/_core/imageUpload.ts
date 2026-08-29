import { TRPCError } from "@trpc/server";
import { detectImageFormat, stripImageMetadata } from "./imageMetadata";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
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
      message: "압축 후에도 이미지가 너무 큽니다.",
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

  // 촬영 장소·시각 같은 숨은 정보를 떼어냅니다. 그림 자체는 그대로입니다.
  return { buffer: stripImageMetadata(buffer), mimeType, ext };
}
