// 키오스크 대기(광고) 화면의 계산만 모아 둔다. 화면 그리기는
// components/kiosk/KioskAttract.tsx 가 맡는다.

export type KioskPoster = {
  id: number;
  imageUrl: string;
  caption: string | null;
  displaySeconds: number;
};

export const KIOSK_ATTRACT_MIN_SECONDS = 3;
export const KIOSK_ATTRACT_MAX_SECONDS = 120;
export const KIOSK_ATTRACT_DEFAULT_SECONDS = 8;

/**
 * 한 장을 보여 줄 시간(밀리초). 서버에서 이상한 값이 와도 화면이 멈추거나
 * 깜빡이지 않도록 사이 값으로 자른다.
 */
export function posterDurationMs(poster: KioskPoster | undefined): number {
  const seconds = poster?.displaySeconds ?? KIOSK_ATTRACT_DEFAULT_SECONDS;
  const safe = Number.isFinite(seconds)
    ? seconds
    : KIOSK_ATTRACT_DEFAULT_SECONDS;
  const clamped = Math.min(
    KIOSK_ATTRACT_MAX_SECONDS,
    Math.max(KIOSK_ATTRACT_MIN_SECONDS, Math.round(safe))
  );
  return clamped * 1000;
}

/** 다음에 보여 줄 장의 번호. 마지막 장 다음은 다시 첫 장이다. */
export function nextPosterIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  const safeCurrent = Number.isFinite(current) ? Math.trunc(current) : 0;
  return (((safeCurrent + 1) % count) + count) % count;
}

/** 목록이 줄어들어도 없는 장을 가리키지 않게 번호를 붙잡아 둔다. */
export function clampPosterIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.trunc(index), count - 1);
}
