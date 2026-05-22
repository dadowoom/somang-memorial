import { TRPCError } from "@trpc/server";

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

  return { buffer, mimeType, ext };
}
