/**
 * 업로드된 사진에서 숨은 정보를 지웁니다.
 *
 * 스마트폰으로 찍은 사진에는 촬영 장소의 위도·경도와 시각, 기기 정보가 함께
 * 저장됩니다. 유가족이 집에서 찍은 영정 사진을 올리면 집 위치가 사진 파일에
 * 남고, 그 파일은 누구나 내려받을 수 있습니다. 올리는 분은 이런 것이 들어
 * 있는 줄 모릅니다.
 *
 * 화면에 보이는 그림은 그대로 두고, 눈에 보이지 않는 정보만 떼어냅니다.
 * 색이 달라지지 않도록 색상 프로필(ICC)은 남깁니다.
 */

/** 파일 앞부분을 보고 정말 그 형식이 맞는지 확인합니다. */
export function detectImageFormat(
  buffer: Buffer
): "jpeg" | "png" | "webp" | "gif" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a") return "gif";
  }
  return null;
}

// EXIF(위치·촬영정보), XMP, IPTC, 주석. 색상 프로필(APP2)과 JFIF(APP0)는 남깁니다.
const JPEG_SEGMENTS_TO_DROP = new Set([0xe1, 0xed, 0xfe]);

function stripJpeg(buffer: Buffer) {
  const parts: Buffer[] = [buffer.subarray(0, 2)]; // SOI
  let offset = 2;

  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) break;

    const marker = buffer[offset + 1];

    // 압축된 그림 데이터가 시작되면 끝까지 그대로 옮깁니다.
    if (marker === 0xda) {
      parts.push(buffer.subarray(offset));
      return Buffer.concat(parts);
    }

    // 길이가 없는 표식들.
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
      parts.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      parts.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) break;

    if (!JPEG_SEGMENTS_TO_DROP.has(marker)) {
      parts.push(buffer.subarray(offset, offset + 2 + length));
    }
    offset += 2 + length;
  }

  // 도중에 형식이 어긋나면 남은 부분을 그대로 붙입니다. 사진이 깨지는 것보다
  // 낫습니다.
  if (offset < buffer.length) parts.push(buffer.subarray(offset));
  return Buffer.concat(parts);
}

const PNG_CHUNKS_TO_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(buffer: Buffer) {
  const parts: Buffer[] = [buffer.subarray(0, 8)];
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const end = offset + 12 + length;
    if (length > buffer.length || end > buffer.length) break;

    if (!PNG_CHUNKS_TO_DROP.has(type)) {
      parts.push(buffer.subarray(offset, end));
    }

    offset = end;
    if (type === "IEND") return Buffer.concat(parts);
  }

  if (offset < buffer.length) parts.push(buffer.subarray(offset));
  return Buffer.concat(parts);
}

const WEBP_CHUNKS_TO_DROP = new Set(["EXIF", "XMP "]);

function stripWebp(buffer: Buffer) {
  const chunks: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const fourcc = buffer.subarray(offset, offset + 4).toString("ascii");
    const size = buffer.readUInt32LE(offset + 4);
    // 각 덩어리는 짝수 길이로 맞춰집니다.
    const padded = size + (size % 2);
    const end = offset + 8 + padded;
    if (end > buffer.length) break;

    if (!WEBP_CHUNKS_TO_DROP.has(fourcc)) {
      chunks.push(buffer.subarray(offset, end));
    }
    offset = end;
  }

  if (chunks.length === 0) return buffer;

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  // RIFF 크기는 'WEBP' 네 글자부터 끝까지의 길이입니다.
  header.writeUInt32LE(4 + body.length, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

/**
 * 알아보지 못하는 형식이나 처리 중 문제가 생기면 원본을 그대로 돌려줍니다.
 * 사진이 깨지는 것보다 낫고, 형식 확인은 별도로 합니다.
 */
export function stripImageMetadata(buffer: Buffer): Buffer {
  try {
    switch (detectImageFormat(buffer)) {
      case "jpeg":
        return stripJpeg(buffer);
      case "png":
        return stripPng(buffer);
      case "webp":
        return stripWebp(buffer);
      default:
        return buffer;
    }
  } catch {
    return buffer;
  }
}
