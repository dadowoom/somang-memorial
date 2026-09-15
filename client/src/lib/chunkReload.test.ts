import { describe, expect, it } from "vitest";
import {
  CHUNK_RELOAD_FLAG,
  clearChunkReloadFlag,
  shouldReloadForPreloadError,
} from "./chunkReload";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("shouldReloadForPreloadError", () => {
  it("첫 실패에는 새로고침하고 표시를 남긴다", () => {
    const storage = memoryStorage();
    expect(shouldReloadForPreloadError(storage)).toBe(true);
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).not.toBeNull();
  });

  it("새로고침 뒤에도 또 실패하면 무한 반복하지 않는다", () => {
    const storage = memoryStorage();
    shouldReloadForPreloadError(storage);
    expect(shouldReloadForPreloadError(storage)).toBe(false);
  });

  it("화면이 정상적으로 뜨면 표시를 지워 다음 배포 때 다시 한 번 허용한다", () => {
    const storage = memoryStorage();
    shouldReloadForPreloadError(storage);
    clearChunkReloadFlag(storage);
    expect(shouldReloadForPreloadError(storage)).toBe(true);
  });

  it("저장소를 못 쓰면(시크릿 창 등) 한 번은 새로고침한다", () => {
    expect(shouldReloadForPreloadError(null)).toBe(true);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(shouldReloadForPreloadError(broken)).toBe(true);
  });
});
