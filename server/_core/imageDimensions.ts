/**
 * 사진 파일 앞부분에서 가로·세로 크기를 읽는다 (2026-09-24). 사진을 풀지 않고
 * 머리말만 본다. 읽지 못하면 null — 그때는 파일 크기 한도만 적용한다.
 */
export function readImageDimensions(
  buffer: Buffer,
  format: "jpeg" | "png" | "webp" | "gif"
): { width: number; height: number } | null {
  try {
    if (format === "png") {
      if (buffer.length < 24) return null;
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
    if (format === "gif") {
      if (buffer.length < 10) return null;
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
    if (format === "webp") return readWebpDimensions(buffer);
    return readJpegDimensions(buffer);
  } catch {
    return null;
  }
}

function readWebpDimensions(buffer: Buffer) {
  if (buffer.length < 30) return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

/** 크기가 적힌 SOF 표시(C0~CF 중 C4·C8·CC 제외)를 찾을 때까지 표시를 건너뛴다. */
function readJpegDimensions(buffer: Buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // 길이가 없는 표시
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}
