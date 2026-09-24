import { describe, expect, it } from "vitest";
import { readImageDimensions } from "./imageDimensions";
import { decodeImageDataUrl } from "./imageUpload";

// 서버에 두는 사진 한도 (2026-09-24). 사진 머리말만 가짜로 만들어 시험한다.
function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpegHeader(width: number, height: number, padding = 0) {
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sof,
    Buffer.alloc(padding),
    Buffer.from([0xff, 0xd9]),
  ]);
}

const dataUrl = (type: string, buffer: Buffer) =>
  `data:${type};base64,${buffer.toString("base64")}`;

describe("사진 가로·세로 읽기", () => {
  it("PNG·JPEG·GIF·WEBP 머리말에서 크기를 읽는다", () => {
    expect(readImageDimensions(pngHeader(4032, 3024), "png")).toEqual({
      width: 4032,
      height: 3024,
    });
    expect(readImageDimensions(jpegHeader(3024, 4032), "jpeg")).toEqual({
      width: 3024,
      height: 4032,
    });
    const gif = Buffer.from("GIF89a\x40\x01\xf0\x00", "latin1");
    expect(readImageDimensions(gif, "gif")).toEqual({
      width: 320,
      height: 240,
    });
    const webp = Buffer.alloc(30);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBPVP8X", 8, "ascii");
    webp.writeUIntLE(2999, 24, 3);
    webp.writeUIntLE(1999, 27, 3);
    expect(readImageDimensions(webp, "webp")).toEqual({
      width: 3000,
      height: 2000,
    });
  });

  it("읽지 못하면 null", () => {
    expect(readImageDimensions(Buffer.from([0xff, 0xd8, 0xff]), "jpeg")).toBe(
      null
    );
  });
});

describe("서버 사진 한도", () => {
  it("긴 변이 2048px 을 넘으면 받지 않는다", () => {
    expect(() =>
      decodeImageDataUrl(dataUrl("image/jpeg", jpegHeader(4032, 3024)))
    ).toThrow(/너무 큽니다/);
    expect(() =>
      decodeImageDataUrl(dataUrl("image/png", pngHeader(2049, 100)))
    ).toThrow(/너무 큽니다/);
  });

  it("1.5MB 를 넘으면 받지 않는다", () => {
    const big = jpegHeader(1000, 800, 1.6 * 1024 * 1024);
    expect(() => decodeImageDataUrl(dataUrl("image/jpeg", big))).toThrow(
      /너무 큽니다/
    );
  });

  it("줄인 사진(2048px 이하·1.5MB 이하)은 받는다", () => {
    const small = jpegHeader(2048, 1536, 1000);
    const decoded = decodeImageDataUrl(dataUrl("image/jpeg", small));
    expect(decoded.ext).toBe("jpg");
  });
});
