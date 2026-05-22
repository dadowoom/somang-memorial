export function toImgUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url;
}

export function toThumbnailUrl(url: string | null | undefined): string {
  return toImgUrl(url);
}
