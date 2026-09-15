/**
 * 배포 직후 옛 화면이 새 조각 파일을 못 받을 때의 처리 (2026-09-15).
 *
 * 화면 파일(JS)은 이름에 해시가 붙고, 배포는 릴리스 폴더를 통째로 바꾼다.
 * 그래서 배포 전에 열어 둔 탭이 그 뒤에 다른 화면으로 넘어가면, 옛 이름의
 * 조각 파일이 서버에 없어 "화면을 표시하는 중 문제가 생겼습니다"가 떴다.
 * Vite 는 이때 `vite:preloadError` 를 알려 주므로, 한 번만 새로고침해서
 * 새 화면 목록을 받아 온다. 새로고침한 뒤에도 또 실패하면(진짜 장애) 다시
 * 새로고침하지 않고 원래대로 오류 화면에 맡긴다.
 */
export const CHUNK_RELOAD_FLAG = "somang:chunk-reloaded";

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

function safeSessionStorage(): FlagStorage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function installChunkReloadHandler() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", event => {
    if (!shouldReloadForPreloadError(safeSessionStorage())) return;
    event.preventDefault();
    window.location.reload();
  });
  // 여기까지 왔으면 첫 화면은 떴다. 다음 배포를 위해 표시를 지운다.
  clearChunkReloadFlag(safeSessionStorage());
}
