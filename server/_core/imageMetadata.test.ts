import { describe, expect, it } from "vitest";
import { detectImageFormat, stripImageMetadata } from "./imageMetadata";

/** EXIF(APP1) 조각을 끼운 최소한의 JPEG 을 만듭니다. */
function makeJpegWithExif(payload = "GPS-LATITUDE-SECRET") {
  const exif = Buffer.concat([
    Buffer.from("Exif\0\0", "binary"),
    Buffer.from(payload, "ascii"),
  ]);
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1]),
    (() => {
      const b = Buffer.alloc(2);
      b.writeUInt16BE(exif.length + 2, 0);
      return b;
    })(),
    exif,
  ]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x03, 0x01, 0xaa, 0xbb, 0xcc]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sos, eoi]);
}

function pngChunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  return Buffer.concat([
    len,
    Buffer.from(type, "ascii"),
    data,
    Buffer.alloc(4),
  ]);
}

function makePngWithText() {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", Buffer.alloc(13)),
    pngChunk("tEXt", Buffer.from("Comment\0CAMERA-SERIAL-1234", "ascii")),
    pngChunk("eXIf", Buffer.from("GPS-DATA-HERE", "ascii")),
    pngChunk("IDAT", Buffer.from([0x01, 0x02, 0x03])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function webpChunk(fourcc: string, data: Buffer) {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(data.length, 0);
  const pad = data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
  return Buffer.concat([Buffer.from(fourcc, "ascii"), size, data, pad]);
}

function makeWebpWithExif() {
  const body = Buffer.concat([
    webpChunk("VP8 ", Buffer.from([0x01, 0x02, 0x03, 0x04])),
    webpChunk("EXIF", Buffer.from("GPS-INSIDE-WEBP", "ascii")),
  ]);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(4 + body.length, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

describe("형식 알아보기", () => {
  it("앞부분을 보고 실제 형식을 알아낸다", () => {
    expect(detectImageFormat(makeJpegWithExif())).toBe("jpeg");
    expect(detectImageFormat(makePngWithText())).toBe("png");
    expect(detectImageFormat(makeWebpWithExif())).toBe("webp");
    expect(detectImageFormat(Buffer.from("GIF89a....", "ascii"))).toBe("gif");
  });

  // 확장자나 브라우저가 알려주는 형식만 믿으면, 사진이 아닌 파일이 사진인 척
  // 들어올 수 있습니다.
  it("사진이 아닌 것은 알아본다", () => {
    expect(
      detectImageFormat(Buffer.from("그냥 글자입니다", "utf-8"))
    ).toBeNull();
    expect(detectImageFormat(Buffer.alloc(0))).toBeNull();
  });
});

describe("JPEG 숨은 정보 제거", () => {
  it("위치정보가 든 EXIF 조각을 떼어낸다", () => {
    const original = makeJpegWithExif();
    expect(original.includes(Buffer.from("GPS-LATITUDE-SECRET"))).toBe(true);

    const cleaned = stripImageMetadata(original);
    expect(cleaned.includes(Buffer.from("GPS-LATITUDE-SECRET"))).toBe(false);
    expect(cleaned.includes(Buffer.from("Exif"))).toBe(false);
  });

  it("그림 자체는 그대로 둔다", () => {
    const cleaned = stripImageMetadata(makeJpegWithExif());
    // 시작 표식과 압축 데이터, 끝 표식이 살아 있어야 사진이 열립니다.
    expect(cleaned.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(cleaned.includes(Buffer.from([0xff, 0xda]))).toBe(true);
    expect(cleaned.includes(Buffer.from([0xaa, 0xbb, 0xcc]))).toBe(true);
    expect(cleaned.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  it("떼어낸 만큼 파일이 작아진다", () => {
    const original = makeJpegWithExif();
    expect(stripImageMetadata(original).length).toBeLessThan(original.length);
  });
});

describe("PNG 숨은 정보 제거", () => {
  it("글자·EXIF 덩어리를 떼어내고 그림 데이터는 남긴다", () => {
    const cleaned = stripImageMetadata(makePngWithText());
    expect(cleaned.includes(Buffer.from("CAMERA-SERIAL-1234"))).toBe(false);
    expect(cleaned.includes(Buffer.from("GPS-DATA-HERE"))).toBe(false);
    expect(cleaned.includes(Buffer.from("IHDR"))).toBe(true);
    expect(cleaned.includes(Buffer.from("IDAT"))).toBe(true);
    expect(cleaned.includes(Buffer.from("IEND"))).toBe(true);
  });
});

describe("WebP 숨은 정보 제거", () => {
  it("EXIF 덩어리를 떼어낸다", () => {
    const cleaned = stripImageMetadata(makeWebpWithExif());
    expect(cleaned.includes(Buffer.from("GPS-INSIDE-WEBP"))).toBe(false);
    expect(cleaned.includes(Buffer.from("VP8 "))).toBe(true);
  });

  // RIFF 는 앞머리에 전체 길이를 적어 둡니다. 덩어리를 빼고 이 값을 고치지
  // 않으면 사진이 깨집니다.
  it("전체 길이 표시를 다시 계산한다", () => {
    const cleaned = stripImageMetadata(makeWebpWithExif());
    expect(cleaned.readUInt32LE(4)).toBe(cleaned.length - 8);
  });
});

describe("망가진 파일을 만났을 때", () => {
  it("알아보지 못하면 원본을 그대로 둔다", () => {
    const odd = Buffer.from("사진이 아닌 무언가", "utf-8");
    expect(stripImageMetadata(odd)).toEqual(odd);
  });

  it("중간이 잘린 JPEG 에도 예외를 던지지 않는다", () => {
    const truncated = makeJpegWithExif().subarray(0, 8);
    expect(() => stripImageMetadata(truncated)).not.toThrow();
  });
});
