import { THUMBNAIL_MAX_BYTES, thumbnailPathFor } from "../../shared/thumbnail";
import { storagePutExact } from "../storage";
import { decodeImageDataUrl } from "./imageUpload";

/**
 * 브라우저가 만든 작은 사진(썸네일)을 받는다. JPEG 이고 작아야 한다. 원본과 같은
 * 검사(형식 확인·숨은 정보 제거)를 거친다. 잘못된 것이 오면 버린다.
 */
export function decodeThumbnailDataUrl(dataUrl: string | undefined) {
  if (!dataUrl) return null;
  try {
    const decoded = decodeImageDataUrl(dataUrl);
    if (decoded.ext !== "jpg" || decoded.buffer.length > THUMBNAIL_MAX_BYTES) {
      return null;
    }
    return decoded.buffer;
  } catch {
    return null;
  }
}

/**
 * 원본 옆에 작은 사진을 둔다 (shared/thumbnail.ts 규칙). 작은 사진이 없거나
 * 잘못됐거나 저장에 실패해도 원본 올리기는 그대로 성공한다. 화면은 작은 사진을
 * 못 찾으면 원본을 보여 준다.
 */
export async function saveThumbnail(storedKey: string, dataUrl?: string) {
  const buffer = decodeThumbnailDataUrl(dataUrl);
  if (!buffer) return false;
  try {
    await storagePutExact(thumbnailPathFor(storedKey), buffer);
    return true;
  } catch (error) {
    console.error("[Thumbnail] 작은 사진 저장 실패", error);
    return false;
  }
}
