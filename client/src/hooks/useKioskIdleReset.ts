import { useEffect, useRef } from "react";

export const KIOSK_IDLE_RESET_MS = 90_000;
// 추모관 화면은 글을 읽는 곳이라 검색 화면(90초)보다 길게 둔다 (2026-09-14).
// 조문객이 천천히 읽다가 끊기지 않도록 3분으로 하고, 끝나기 30초 전에 알린다.
export const KIOSK_MEMORIAL_IDLE_RESET_MS = 3 * 60_000;
export const KIOSK_IDLE_WARNING_MS = 30_000;

export type KioskIdleResetOptions = {
  /** 초기화 몇 ms 전에 onWarn 을 부를지. 0 이거나 없으면 안 부른다. */
  warnBeforeMs?: number;
  /** 곧 초기화된다는 알림. 화면에 "잠시 뒤 처음으로 돌아갑니다"를 띄울 때 쓴다. */
  onWarn?: () => void;
  /** 알림이 뜬 뒤 사람이 화면을 만졌을 때. 알림을 지울 때 쓴다. */
  onActive?: () => void;
};
export const KIOSK_ACCESS_STORAGE_PREFIX = "somang.memorialAccess.";
export const KIOSK_LAST_ACTIVITY_STORAGE_KEY = "somang.kiosk.lastActivityAt";

export function kioskAccessStorageKey(slug: string) {
  return `${KIOSK_ACCESS_STORAGE_PREFIX}${slug}`;
}

export function clearKioskAccessStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(KIOSK_ACCESS_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => storage.removeItem(key));
}

export function clearBrowserKioskAccessStorage() {
  if (typeof window === "undefined") return;
  clearKioskAccessStorage(window.sessionStorage);
}

export function readKioskLastActivityAt(storage: Storage, fallback: number) {
  const value = Number(storage.getItem(KIOSK_LAST_ACTIVITY_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function writeKioskLastActivityAt(storage: Storage, value: number) {
  storage.setItem(KIOSK_LAST_ACTIVITY_STORAGE_KEY, String(value));
}

export function useKioskIdleReset(
  onIdle: () => void,
  timeoutMs = KIOSK_IDLE_RESET_MS,
  options: KioskIdleResetOptions = {}
) {
  const onIdleRef = useRef(onIdle);
  const optionsRef = useRef(options);
  const warnBeforeMs = options.warnBeforeMs ?? 0;

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const readInitialActivityAt = () => {
      const now = Date.now();
      try {
        return readKioskLastActivityAt(window.sessionStorage, now);
      } catch {
        return now;
      }
    };

    const rememberActivityAt = (value: number) => {
      try {
        writeKioskLastActivityAt(window.sessionStorage, value);
      } catch {
        // The kiosk still resets even if browser storage is unavailable.
      }
    };

    let lastActivityAt = readInitialActivityAt();
    let timer = 0;
    let warnTimer = 0;
    let warned = false;

    // 초기화 warnBeforeMs 전에 한 번만 알린다. 사람이 만지면 알림을 거둔다.
    const scheduleWarn = () => {
      window.clearTimeout(warnTimer);
      if (warnBeforeMs <= 0 || warnBeforeMs >= timeoutMs) return;
      const delayMs = timeoutMs - warnBeforeMs - (Date.now() - lastActivityAt);
      warnTimer = window.setTimeout(
        () => {
          warned = true;
          optionsRef.current.onWarn?.();
        },
        Math.max(0, delayMs)
      );
    };

    const clearWarning = () => {
      if (!warned) return;
      warned = false;
      optionsRef.current.onActive?.();
    };

    const runIdleReset = () => {
      lastActivityAt = Date.now();
      rememberActivityAt(lastActivityAt);
      warned = false;
      onIdleRef.current();
      scheduleReset(timeoutMs);
      scheduleWarn();
    };

    const scheduleReset = (delayMs: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const remainingMs = timeoutMs - (Date.now() - lastActivityAt);
        if (remainingMs <= 0) {
          runIdleReset();
          return;
        }
        scheduleReset(remainingMs);
      }, delayMs);
    };

    const restartTimer = () => {
      lastActivityAt = Date.now();
      rememberActivityAt(lastActivityAt);
      clearWarning();
      scheduleReset(timeoutMs);
      scheduleWarn();
    };

    const checkAfterVisibilityChange = () => {
      if (document.visibilityState === "hidden") return;

      const remainingMs = timeoutMs - (Date.now() - lastActivityAt);
      if (remainingMs <= 0) {
        runIdleReset();
        return;
      }
      scheduleReset(remainingMs);
    };

    rememberActivityAt(lastActivityAt);
    scheduleReset(Math.max(0, timeoutMs - (Date.now() - lastActivityAt)));
    scheduleWarn();
    window.addEventListener("pointerdown", restartTimer);
    window.addEventListener("keydown", restartTimer);
    window.addEventListener("input", restartTimer);
    window.addEventListener("wheel", restartTimer, { passive: true });
    window.addEventListener("touchstart", restartTimer, { passive: true });
    document.addEventListener("visibilitychange", checkAfterVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(warnTimer);
      window.removeEventListener("pointerdown", restartTimer);
      window.removeEventListener("keydown", restartTimer);
      window.removeEventListener("input", restartTimer);
      window.removeEventListener("wheel", restartTimer);
      window.removeEventListener("touchstart", restartTimer);
      document.removeEventListener(
        "visibilitychange",
        checkAfterVisibilityChange
      );
    };
  }, [timeoutMs, warnBeforeMs]);
}
