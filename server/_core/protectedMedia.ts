import { createHmac, timingSafeEqual } from "crypto";
import { THUMBNAIL_SUFFIX } from "../../shared/thumbnail";
import { UPLOAD_URL_PREFIX } from "../storage";
import { ENV } from "./env";

/**
 * 가족관·비공개 추모관 사진 보호 (2026-09-23, 계획서 8번 P-1).
 *
 * 전에는 사진 주소(/uploads/...)만 알면 누구나 볼 수 있었다. 주소는 맞히기
 * 어렵지만, 한 번 퍼지면 가족관 비밀번호를 바꿔도 계속 보였다.
 *
 * 이제 가족관 사진과 비공개(또는 작성 중) 추모관 사진은 "기한이 적힌 주소"로만
 * 보인다. 볼 자격을 확인한 요청에만 서버가 이 주소를 만들어 준다.
 *
 *   /uploads/family-rooms/12/abc_1234.jpg                      → 막힘
 *   /uploads/s/<만료시각>.<서명>/family-rooms/12/abc_1234.jpg   → 기한 안에만 보임
 *
 * 파일이 놓인 자리와 DB 에 적힌 주소는 그대로다. 주소를 내줄 때만 바꾼다.
 * 공개 추모관 사진은 지금처럼 그냥 주소로 보이고, 브라우저에 30일 저장된다.
 */

/** 기한이 적힌 주소가 붙는 자리. 올린 파일의 첫 폴더 이름과 겹치지 않는다. */
export const SIGNED_SEGMENT = "s";

/**
 * 주소는 6시간 단위로 같게 만든다. 같은 시간대에 다시 불러도 주소가 같아서
 * 브라우저에 저장된 사진을 다시 쓴다. 그래서 받은 주소는 6~12시간 동안 보인다.
 */
export const SIGNED_MEDIA_BUCKET_SECONDS = 6 * 60 * 60;

const SIGNATURE_LENGTH = 32;

function mediaSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("서버 비밀값이 설정되지 않았습니다.");
  return secret;
}

/**
 * 원본과 작은 사진(썸네일)이 같은 서명을 쓰게, 끝의 확장자를 뗀 이름에 서명한다.
 *   gallery/3/abc_1234.png       → gallery/3/abc_1234
 *   gallery/3/abc_1234.thumb.jpg → gallery/3/abc_1234
 */
export function mediaStem(key: string) {
  if (key.endsWith(THUMBNAIL_SUFFIX)) {
    return key.slice(0, -THUMBNAIL_SUFFIX.length);
  }
  return key.replace(/\.[A-Za-z0-9]+$/, "");
}

function signature(stem: string, exp: number, secret: string) {
  return createHmac("sha256", secret)
    .update(`somang-media:v1:${exp}:${stem}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function signedMediaExpiry(nowMs = Date.now()) {
  const bucket = Math.floor(nowMs / 1000 / SIGNED_MEDIA_BUCKET_SECONDS);
  return (bucket + 2) * SIGNED_MEDIA_BUCKET_SECONDS;
}

/**
 * 우리 서버에 올린 사진 주소(/uploads/...)를 기한이 적힌 주소로 바꾼다.
 * 바깥 주소나 이미 바꾼 주소는 그대로 둔다.
 */
export function signMediaUrl(
  url: string,
  nowMs = Date.now(),
  secret = mediaSecret()
): string {
  const prefix = `${UPLOAD_URL_PREFIX}/`;
  if (!url.startsWith(prefix)) return url;
  const key = url.slice(prefix.length);
  if (!key || key.startsWith(`${SIGNED_SEGMENT}/`)) return url;
  const exp = signedMediaExpiry(nowMs);
  const sig = signature(mediaStem(key), exp, secret);
  return `${prefix}${SIGNED_SEGMENT}/${exp}.${sig}/${key}`;
}

export type ParsedUploadPath =
  | { kind: "plain"; key: string }
  | { kind: "signed"; key: string; exp: number; sig: string };

/**
 * /uploads 아래 요청 경로를 읽는다. 파일을 내주는 쪽(express.static)과 똑같이
 * 한 번 풀어 읽고 빈 칸·"." 을 버린다. 그래야 "%66amily-rooms" 나
 * "gallery/../family-rooms" 같은 우회 주소도 같은 파일로 알아본다.
 * 읽을 수 없는 경로는 null.
 */
export function parseUploadPath(rawPath: string): ParsedUploadPath | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes("\\") || decoded.includes("\0")) return null;
  const parts = decoded.split("/").filter(part => part && part !== ".");
  if (parts.length === 0 || parts.some(part => part === "..")) return null;

  if (parts[0] === SIGNED_SEGMENT) {
    const match = /^(\d{1,12})\.([A-Za-z0-9_-]+)$/.exec(parts[1] ?? "");
    const key = parts.slice(2).join("/");
    if (!match || !key) return null;
    return { kind: "signed", key, exp: Number(match[1]), sig: match[2] };
  }

  return { kind: "plain", key: parts.join("/") };
}

export function verifySignedMedia(
  input: { key: string; exp: number; sig: string },
  nowMs = Date.now(),
  secret = mediaSecret()
) {
  if (input.exp * 1000 <= nowMs) return false;
  const expected = Buffer.from(
    signature(mediaStem(input.key), input.exp, secret)
  );
  const given = Buffer.from(input.sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * 이 파일이 보호 대상일 수 있는지. 가족관 사진은 늘 보호하고, 추모관 사진은
 * 그 추모관이 비공개인지 따로 확인한다 (storageProxy). 나머지(관리자가 올린
 * 사진, 키오스크 안내 사진 등)는 공개다.
 */
export type MediaScope =
  | { type: "family-room" }
  | { type: "gallery"; memorialId: number }
  | null;

export function mediaScope(key: string): MediaScope {
  const [folder, id] = key.split("/");
  if (folder === "family-rooms") return { type: "family-room" };
  if (folder === "gallery" && id && /^\d+$/.test(id)) {
    return { type: "gallery", memorialId: Number(id) };
  }
  return null;
}
