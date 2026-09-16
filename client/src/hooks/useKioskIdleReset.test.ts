import { describe, expect, it } from "vitest";
import {
  clearKioskAccessStorage,
  kioskAccessStorageKey,
  KIOSK_IDLE_RESET_MS,
  KIOSK_IDLE_WARNING_MS,
  KIOSK_LAST_ACTIVITY_STORAGE_KEY,
  KIOSK_MEMORIAL_IDLE_RESET_MS,
  readKioskLastActivityAt,
} from "./useKioskIdleReset";

describe("kiosk idle timing", () => {
  // 2026-09-16 저녁 현장 결정: 첫 화면이 아닌 화면은 모두 "최소 3분".
  it("첫 화면이 아닌 화면과 추모관 화면은 3분 두고, 안내는 그 안에서 뜬다", () => {
    expect(KIOSK_IDLE_RESET_MS).toBe(3 * 60_000);
    expect(KIOSK_MEMORIAL_IDLE_RESET_MS).toBe(3 * 60_000);
    expect(KIOSK_IDLE_WARNING_MS).toBeGreaterThan(0);
    expect(KIOSK_IDLE_WARNING_MS).toBeLessThan(KIOSK_MEMORIAL_IDLE_RESET_MS);
  });
});

function createStorage(initialValues: Record<string, string>): Storage {
  const values = new Map(Object.entries(initialValues));

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("kiosk access storage", () => {
  it("removes only kiosk memorial access tokens", () => {
    const storage = createStorage({
      [kioskAccessStorageKey("private-a")]: "token-a",
      [kioskAccessStorageKey("private-b")]: "token-b",
      "somang.unrelated": "keep-me",
    });

    clearKioskAccessStorage(storage);

    expect(storage.getItem(kioskAccessStorageKey("private-a"))).toBeNull();
    expect(storage.getItem(kioskAccessStorageKey("private-b"))).toBeNull();
    expect(storage.getItem("somang.unrelated")).toBe("keep-me");
  });

  it("keeps the last activity timestamp separate from access tokens", () => {
    const storage = createStorage({
      [KIOSK_LAST_ACTIVITY_STORAGE_KEY]: "12345",
      [kioskAccessStorageKey("private-a")]: "token-a",
    });

    clearKioskAccessStorage(storage);

    expect(readKioskLastActivityAt(storage, 999)).toBe(12345);
    expect(storage.getItem(kioskAccessStorageKey("private-a"))).toBeNull();
  });

  it("uses a safe fallback for a missing or invalid timestamp", () => {
    const storage = createStorage({
      [KIOSK_LAST_ACTIVITY_STORAGE_KEY]: "not-a-number",
    });

    expect(readKioskLastActivityAt(storage, 999)).toBe(999);
  });
});
