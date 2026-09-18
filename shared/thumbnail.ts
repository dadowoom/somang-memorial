/**
 * 사진첩 작은 사진(썸네일) 규칙 (2026-09-19).
 *
 * 사진첩 격자가 원본(최대 2400px, 수 MB)을 그대로 받아서, 부고 링크를 여러 사람이
 * 열면 서버 회선이 금방 찼다. 사진을 올릴 때 브라우저가 긴 변 800px 짜리 작은
 * 사진을 하나 더 만들어 원본 옆에 정해진 이름으로 둔다.
 *
 *   /uploads/gallery/12/abc_1234.jpg  →  /uploads/gallery/12/abc_1234.thumb.jpg
 *
 * DB 에는 따로 적지 않는다. 이름만 보면 찾을 수 있고, 작은 사진이 없는 옛 사진은
 * 화면이 원본으로 돌아간다.
 */
export const THUMBNAIL_SUFFIX = ".thumb.jpg";
export const THUMBNAIL_MAX_DIMENSION = 800;
/** 작은 사진은 이보다 클 수 없다. 원본(20MB)과 같은 한도를 쓸 이유가 없다. */
export const THUMBNAIL_MAX_BYTES = 600 * 1024;

/** 원본 경로(또는 주소)에서 작은 사진의 경로(주소)를 만든다. */
export function thumbnailPathFor(path: string): string {
  if (path.endsWith(THUMBNAIL_SUFFIX)) return path;
  const withoutExt = path.replace(/\.[A-Za-z0-9]+$/, "");
  return `${withoutExt}${THUMBNAIL_SUFFIX}`;
}

/** 우리 서버에 올린 사진만 작은 사진이 있을 수 있다. */
export function hasThumbnailSlot(
  url: string | null | undefined
): url is string {
  return Boolean(
    url && /(^|\/)uploads\//.test(url) && !url.endsWith(THUMBNAIL_SUFFIX)
  );
}
