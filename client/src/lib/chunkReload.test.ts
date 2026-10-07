import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_FLAG,
  CHUNK_RELOAD_SETTLE_MS,
  clearChunkReloadFlag,
  createChunkReloadGuard,
  installChunkReloadHandler,
  markScreenRendered,
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

/** 정해진 시간 뒤 할 일을 모아 두었다가, 시험이 원할 때 실행한다. */
function manualScheduler() {
  const jobs: Array<{ run: () => void; ms: number }> = [];
  return {
    jobs,
    schedule: (run: () => void, ms: number) => {
      jobs.push({ run, ms });
    },
    runAll: () => {
      for (const job of jobs.splice(0)) job.run();
    },
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

// 2026-10-07: 표시는 화면이 실제로 정상으로 뜬 뒤에만 지운다.
describe("createChunkReloadGuard", () => {
  it("조각 파일이 계속 실패하면 새로고침은 한 번뿐이다", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    // 첫 페이지: 실패 → 한 번 새로고침
    const first = createChunkReloadGuard({ storage, reload, schedule: () => {} });
    const firstEvent = { preventDefault: vi.fn() };
    first.onPreloadError(firstEvent);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(firstEvent.preventDefault).toHaveBeenCalled();
    // 새로고침된 다음 페이지: 화면이 뜨기 전에 또 실패 → 더는 새로고침하지 않는다
    const second = createChunkReloadGuard({ storage, reload, schedule: () => {} });
    const secondEvent = { preventDefault: vi.fn() };
    second.onPreloadError(secondEvent);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("화면이 그려지고 10초 동안 오류가 없으면 표시를 지운다", () => {
    const storage = memoryStorage();
    storage.setItem(CHUNK_RELOAD_FLAG, "1"); // 지난 페이지에서 한 번 새로고침했다
    const scheduler = manualScheduler();
    const guard = createChunkReloadGuard({
      storage,
      reload: vi.fn(),
      schedule: scheduler.schedule,
    });
    guard.onScreenRendered();
    expect(scheduler.jobs.map(job => job.ms)).toEqual([CHUNK_RELOAD_SETTLE_MS]);
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe("1"); // 아직 기다리는 중
    scheduler.runAll();
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBeNull();
  });

  it("화면이 그려졌어도 그 사이 조각 오류가 났으면 표시를 지우지 않는다", () => {
    const storage = memoryStorage();
    storage.setItem(CHUNK_RELOAD_FLAG, "1");
    const scheduler = manualScheduler();
    const reload = vi.fn();
    const guard = createChunkReloadGuard({
      storage,
      reload,
      schedule: scheduler.schedule,
    });
    guard.onScreenRendered();
    guard.onPreloadError({ preventDefault: vi.fn() });
    scheduler.runAll();
    expect(reload).not.toHaveBeenCalled();
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe("1");
  });

  it("화면이 그려졌다는 알림이 여러 번 와도 한 번만 잰다", () => {
    const scheduler = manualScheduler();
    const guard = createChunkReloadGuard({
      storage: memoryStorage(),
      reload: vi.fn(),
      schedule: scheduler.schedule,
    });
    guard.onScreenRendered();
    guard.onScreenRendered();
    expect(scheduler.jobs).toHaveLength(1);
  });
});

describe("installChunkReloadHandler", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function installWithFakeWindow(storage: ReturnType<typeof memoryStorage>) {
    const listeners = new Map<string, (event: { preventDefault(): void }) => void>();
    const reload = vi.fn();
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", {
      addEventListener: (
        type: string,
        listener: (event: { preventDefault(): void }) => void
      ) => {
        listeners.set(type, listener);
      },
      location: { reload },
      setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
    });
    installChunkReloadHandler();
    return { listeners, reload };
  }

  it("앱이 시작할 때는 표시를 지우지 않는다 — 화면이 뜨기 전 또 실패해도 새로고침을 되풀이하지 않는다", () => {
    const storage = memoryStorage();
    storage.setItem(CHUNK_RELOAD_FLAG, "1"); // 바로 전 페이지에서 한 번 새로고침했다
    const { listeners, reload } = installWithFakeWindow(storage);
    // 예전 코드는 여기서 표시를 지워, 다음 실패에 또 새로고침했다(끝없는 반복).
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe("1");
    listeners.get("vite:preloadError")?.({ preventDefault: vi.fn() });
    expect(reload).not.toHaveBeenCalled();
  });

  it("화면이 그려지고 10초가 지나야 표시를 지운다", () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.setItem(CHUNK_RELOAD_FLAG, "1");
    installWithFakeWindow(storage);
    markScreenRendered();
    vi.advanceTimersByTime(CHUNK_RELOAD_SETTLE_MS - 1);
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBe("1");
    vi.advanceTimersByTime(1);
    expect(storage.getItem(CHUNK_RELOAD_FLAG)).toBeNull();
  });
});
