// 키오스크 대기(광고) 화면의 계산만 모아 둔다. 화면 그리기는
// components/kiosk/KioskAttract.tsx 가 맡는다.

export type KioskPoster = {
  id: number;
  imageUrl: string;
  caption: string | null;
  displaySeconds: number;
};

/**
 * 광고(대기) 화면은 이만큼 아무도 만지지 않았을 때 시작한다.
 * 처음 켰을 때나 "처음으로"를 눌렀을 때 바로 광고가 나오면 안 된다.
 *
 * 2026-09-16 저녁 현장 결정: 5분에서 30초로 줄였다. 검색 화면에서 30초 동안
 * 아무 터치가 없으면 바로 광고를 띄우고, 어디든 한 번 누르면 하던 화면으로 돌아간다.
 */
export const KIOSK_ATTRACT_IDLE_MS = 30_000;

export const KIOSK_ATTRACT_MIN_SECONDS = 3;
export const KIOSK_ATTRACT_MAX_SECONDS = 120;
export const KIOSK_ATTRACT_DEFAULT_SECONDS = 8;

/** 추모관 화면에서 3분 무입력으로 돌아올 때 첫 화면이 광고부터 띄우라는 표시. */
export const KIOSK_ATTRACT_ON_ARRIVAL_KEY = "somang.kiosk.attractOnArrival";

function kioskSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** 다음에 첫 화면이 뜰 때 광고부터 띄우도록 표시해 둔다. */
export function requestKioskAttractOnArrival(
  storage: Storage | null = kioskSessionStorage()
) {
  try {
    storage?.setItem(KIOSK_ATTRACT_ON_ARRIVAL_KEY, "1");
  } catch {
    // 저장이 막혀 있으면 광고 없이 첫 화면만 보인다.
  }
}

/** 표시가 있으면 true 를 돌려주고 지운다. 한 번만 광고를 띄운다. */
export function consumeKioskAttractOnArrival(
  storage: Storage | null = kioskSessionStorage()
): boolean {
  try {
    if (!storage) return false;
    const requested = storage.getItem(KIOSK_ATTRACT_ON_ARRIVAL_KEY) === "1";
    storage.removeItem(KIOSK_ATTRACT_ON_ARRIVAL_KEY);
    return requested;
  } catch {
    return false;
  }
}

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
