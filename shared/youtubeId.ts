/**
 * 유튜브 주소 또는 영상 번호에서 11자리 영상 번호만 꺼낸다 (2026-09-16).
 * 가족관 영상 입력칸은 주소를 통째로 붙여 넣는 경우가 대부분이라 서버가 번호를 골라낸다.
 * 알아볼 수 없으면 null.
 */
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const URL_PATTERNS = [
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /[?&]v=([A-Za-z0-9_-]{11})/,
  /embed\/([A-Za-z0-9_-]{11})/,
  /shorts\/([A-Za-z0-9_-]{11})/,
  /live\/([A-Za-z0-9_-]{11})/,
];

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return trimmed;
  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}
