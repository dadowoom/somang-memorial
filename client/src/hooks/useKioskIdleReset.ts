import { useEffect, useRef } from "react";

export const KIOSK_IDLE_RESET_MS = 90_000;
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
  timeoutMs = KIOSK_IDLE_RESET_MS
) {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

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

    const runIdleReset = () => {
      lastActivityAt = Date.now();
      rememberActivityAt(lastActivityAt);
      onIdleRef.current();
      scheduleReset(timeoutMs);
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
      scheduleReset(timeoutMs);
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
    window.addEventListener("pointerdown", restartTimer);
    window.addEventListener("keydown", restartTimer);
    window.addEventListener("input", restartTimer);
    window.addEventListener("wheel", restartTimer, { passive: true });
    window.addEventListener("touchstart", restartTimer, { passive: true });
    document.addEventListener("visibilitychange", checkAfterVisibilityChange);

    return () => {
      window.clearTimeout(timer);
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
  }, [timeoutMs]);
}
