import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/var/www/somang-memorial/uploads"
    : path.join(process.cwd(), "uploads"));

export const UPLOAD_URL_PREFIX = "/uploads";

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeKey(relKey: string) {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = key.split("/").filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some(part => part === "." || part === ".." || part.includes("\0"))
  ) {
    throw new Error("Invalid storage key");
  }
  return parts.join("/");
}

function appendHashSuffix(relKey: string) {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(UPLOAD_DIR, key);
  ensureDir(path.dirname(filePath));

  const buffer =
    typeof data === "string"
      ? Buffer.from(data, "utf-8")
      : Buffer.from(data as Uint8Array);

  fs.writeFileSync(filePath, buffer);

  return { key, url: `${UPLOAD_URL_PREFIX}/${key}` };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: `${UPLOAD_URL_PREFIX}/${key}` };
}

export async function storageGetSignedUrl(relKey: string) {
  const key = normalizeKey(relKey);
  return `${UPLOAD_URL_PREFIX}/${key}`;
}

/**
 * 정해진 이름 그대로 저장한다(뒤에 무작위 글자를 붙이지 않는다). 원본 옆에 두는
 * 작은 사진처럼 이름으로 찾아야 하는 파일에만 쓴다.
 */
export async function storagePutExact(
  relKey: string,
  data: Buffer | Uint8Array
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = path.join(UPLOAD_DIR, key);
  ensureDir(path.dirname(filePath));
  await fs.promises.writeFile(filePath, Buffer.from(data as Uint8Array));
  return { key, url: `${UPLOAD_URL_PREFIX}/${key}` };
}
