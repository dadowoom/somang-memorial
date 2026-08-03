import { describe, expect, it } from "vitest";
import {
  clearKioskAccessStorage,
  kioskAccessStorageKey,
  KIOSK_LAST_ACTIVITY_STORAGE_KEY,
  readKioskLastActivityAt,
} from "./useKioskIdleReset";

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
