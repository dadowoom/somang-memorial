// 키오스크 자동 새로고침의 계산만 모아 둔다. 실제 동작(주기 확인·새로고침)은
// hooks/useKioskAutoReload.ts 가 맡는다 (2026-09-15).
//
// 키오스크는 아무도 새로고침을 눌러 주지 않는 기기다. 배포로 화면 파일이
// 바뀌어도 옛 화면이 계속 떠 있고, 며칠씩 켜 둔 브라우저는 무거워진다.
// 그래서 (1) 서버의 현재 화면 묶음 파일 이름이 지금 떠 있는 것과 달라지면,
// (2) 매일 새벽 정해진 시간에, 손님이 쓰는 중이 아닐 때만 스스로 새로고침한다.

/** 서버의 화면 묶음 파일 이름을 다시 확인하는 간격. */
export const KIOSK_BUILD_CHECK_INTERVAL_MS = 5 * 60 * 1000;
/** 새로고침해도 되는지 다시 따져 보는 간격 (손님이 떠난 직후를 놓치지 않게 짧다). */
export const KIOSK_RELOAD_TICK_MS = 60 * 1000;
/** 매일 이 시(時)에 한 번 새로고침한다 (04:00~04:59). */
export const KIOSK_NIGHTLY_RELOAD_HOUR = 4;
/** 새벽 새로고침은 이만큼은 켜져 있었을 때만 한다. 새로고침 직후 또 하지 않기 위함. */
export const KIOSK_NIGHTLY_MIN_UPTIME_MS = 12 * 60 * 60 * 1000;

const ENTRY_BUNDLE_IN_HTML = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/;
const ENTRY_BUNDLE_IN_SRC = /\/assets\/(index-[A-Za-z0-9_-]+\.js)$/;

/** index.html 본문에서 화면 묶음 파일 이름(index-XXXX.js)을 찾는다. 없으면 null. */
export function extractEntryBundle(html: string): string | null {
  const match = ENTRY_BUNDLE_IN_HTML.exec(html);
  return match ? match[1] : null;
}

/** 지금 떠 있는 화면이 쓰는 묶음 파일 이름. 개발 서버처럼 해시 파일이 없으면 null. */
export function currentEntryBundle(scriptSources: string[]): string | null {
  for (const src of scriptSources) {
    const match = ENTRY_BUNDLE_IN_SRC.exec(src);
    if (match) return match[1];
  }
  return null;
}

export type KioskReloadReason = "new-build" | "nightly";

/**
 * 지금 새로고침해야 하는지 판단한다. 손님이 쓰는 중(idle=false)이거나
 * 인터넷이 끊겨 있으면(online=false) 절대 새로고침하지 않는다 — 끊긴 채
 * 새로고침하면 브라우저 오류 화면이 뜬 채로 멈춘다.
 */
export function decideKioskReload(input: {
  idle: boolean;
  online: boolean;
  currentBundle: string | null;
  latestBundle: string | null;
  now: Date;
  startedAt: number;
}): KioskReloadReason | null {
  if (!input.idle || !input.online) return null;

  if (
    input.currentBundle &&
    input.latestBundle &&
    input.currentBundle !== input.latestBundle
  ) {
    return "new-build";
  }

  const uptime = input.now.getTime() - input.startedAt;
  if (
    input.now.getHours() === KIOSK_NIGHTLY_RELOAD_HOUR &&
    uptime >= KIOSK_NIGHTLY_MIN_UPTIME_MS
  ) {
    return "nightly";
  }

  return null;
}
