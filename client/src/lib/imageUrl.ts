import { hasThumbnailSlot, thumbnailPathFor } from "@shared/thumbnail";

export function toImgUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url;
}

/**
 * 작은 사진(썸네일) 주소 (2026-09-19, shared/thumbnail.ts). 우리 서버에 올린
 * 사진만 작은 사진이 있을 수 있다. 옛 사진은 작은 사진이 없으므로 화면에서는
 * <ThumbImage> 로 써서, 못 찾으면 원본으로 돌아가게 한다.
 */
export function toThumbnailUrl(url: string | null | undefined): string {
  if (!url) return "";
  return hasThumbnailSlot(url) ? thumbnailPathFor(url) : url;
}
