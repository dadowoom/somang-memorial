/**
 * 배포 직후 옛 화면이 새 조각 파일을 못 받을 때의 처리 (2026-09-15).
 *
 * 화면 파일(JS)은 이름에 해시가 붙고, 배포는 릴리스 폴더를 통째로 바꾼다.
 * 그래서 배포 전에 열어 둔 탭이 그 뒤에 다른 화면으로 넘어가면, 옛 이름의
 * 조각 파일이 서버에 없어 "화면을 표시하는 중 문제가 생겼습니다"가 떴다.
 * Vite 는 이때 `vite:preloadError` 를 알려 주므로, 한 번만 새로고침해서
 * 새 화면 목록을 받아 온다. 새로고침한 뒤에도 또 실패하면(진짜 장애) 다시
 * 새로고침하지 않고 원래대로 오류 화면에 맡긴다.
 *
 * "한 번 새로고침했다"는 표시는 화면이 실제로 정상으로 뜬 뒤에만 지운다 (2026-10-07).
 * 전에는 앱이 시작하자마자 지워서, 조각 파일이 계속 실패하면 "지우기 → 실패 →
 * 새로고침"이 끝없이 되풀이될 수 있었다. 이제는 화면이 그려지고(App.tsx 의
 * ScreenRenderedSignal) 그 뒤 10초 동안 이 페이지에서 조각 파일 오류가 없을 때만 지운다.
 */
export const CHUNK_RELOAD_FLAG = "somang:chunk-reloaded";

/** 화면이 그려진 뒤 이만큼 조각 파일 오류 없이 지나야 "정상"으로 보고 표시를 지운다. */
export const CHUNK_RELOAD_SETTLE_MS = 10_000;

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** 새로고침해도 되는지 판단하고, 한다면 표시를 남긴다. 두 번째는 false. */
export function shouldReloadForPreloadError(storage: FlagStorage | null) {
  if (!storage) return true;
  try {
    if (storage.getItem(CHUNK_RELOAD_FLAG)) return false;
    storage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

/** 화면이 정상적으로 떴으면 표시를 지워, 다음 배포 때 또 한 번 새로고침할 수 있게 한다. */
export function clearChunkReloadFlag(storage: FlagStorage | null) {
  if (!storage) return;
  try {
    storage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    // 저장소를 못 써도 화면은 정상이다.
  }
}

type ChunkReloadDeps = {
  storage: FlagStorage | null;
  reload: () => void;
  schedule: (run: () => void, ms: number) => void;
};

/**
 * 한 번 불러온 페이지 동안의 판단.
 * - 조각 파일 오류: 처음이면 새로고침, 이미 한 번 했으면 그대로 둔다(오류 화면).
 * - 화면이 그려짐: 10초 뒤에도 이 페이지에서 조각 파일 오류가 없었으면 표시를 지운다.
 */
export function createChunkReloadGuard(deps: ChunkReloadDeps) {
  let failedThisPage = false;
  let settling = false;
  return {
    onPreloadError(event: { preventDefault(): void }) {
      failedThisPage = true;
      if (!shouldReloadForPreloadError(deps.storage)) return;
      event.preventDefault();
      deps.reload();
    },
    onScreenRendered() {
      if (settling) return;
      settling = true;
      deps.schedule(() => {
        if (!failedThisPage) clearChunkReloadFlag(deps.storage);
      }, CHUNK_RELOAD_SETTLE_MS);
    },
  };
}

function safeSessionStorage(): FlagStorage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

let pageGuard: ReturnType<typeof createChunkReloadGuard> | null = null;

export function installChunkReloadHandler() {
  if (typeof window === "undefined") return;
  const guard = createChunkReloadGuard({
    storage: safeSessionStorage(),
    reload: () => window.location.reload(),
    schedule: (run, ms) => {
      window.setTimeout(run, ms);
    },
  });
  pageGuard = guard;
  window.addEventListener("vite:preloadError", event => {
    guard.onPreloadError(event);
  });
  // 여기서는 표시를 지우지 않는다. 화면이 실제로 그려진 뒤 markScreenRendered 가 맡는다.
}

/** 화면이 실제로 그려졌을 때 App.tsx 의 ScreenRenderedSignal 이 부른다. */
export function markScreenRendered() {
  pageGuard?.onScreenRendered();
}
