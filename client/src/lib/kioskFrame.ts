import {
  normalizeKioskDisplaySettings,
  parseKioskRotateParam,
  type KioskDisplaySettings,
  type KioskRotateOverride,
} from "@shared/kioskDisplay";

/**
 * 키오스크 세로 고정의 화면 쪽 도우미 (2026-10-03, shared/kioskDisplay.ts).
 *
 * 세로 고정이 켜지면 바깥 창은 같은 키오스크 주소를 틀(iframe) 하나에 담아
 * 90° 돌린다. 틀 안은 처음부터 세로 창(1080×1920)이라, 화면 크기에 맞춘 모양·
 * 창 위에 뜨는 것(자판·문의 창·맨 위로 단추·연결 끊김 띠·알림)·스크롤·터치
 * 위치가 모두 세로 키오스크와 똑같이 돈다. 틀 안의 화면은 다시 돌리지 않는다.
 */

/** 이 창이 세로 고정용 틀 안인가. 같은 사이트가 감싼 틀일 때만 그렇다. */
export function isKioskRotationFrame(win: Window = window) {
  try {
    return (
      win.self !== win.top &&
      win.top !== null &&
      win.top.location.origin === win.location.origin
    );
  } catch {
    return false;
  }
}

/**
 * 키오스크를 새로고침한다. 틀 안이면 바깥 창째 새로고침해야 새 배포의
 * 바깥 화면까지 바뀐다.
 */
export function reloadKioskDocument(win: Window = window) {
  if (isKioskRotationFrame(win) && win.top) {
    win.top.location.reload();
    return;
  }
  win.location.reload();
}

const OVERRIDE_STORAGE_KEY = "somang:kiosk-rotate-override";
const SETTINGS_STORAGE_KEY = "somang:kiosk-display";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(read: () => StorageLike): StorageLike | null {
  try {
    return read();
  } catch {
    return null;
  }
}

/**
 * 주소의 ?rotate=cw|ccw|off 를 읽는다. 화면을 옮겨 다니거나 스스로 새로고침해도
 * 유지되게 이 탭에 기억해 둔다. ?rotate=auto 는 기억을 지운다.
 */
export function readKioskRotateOverride(
  search: string,
  storage: StorageLike | null = safeStorage(() => window.sessionStorage)
): KioskRotateOverride | null {
  const fromUrl = parseKioskRotateParam(
    new URLSearchParams(search).get("rotate")
  );
  try {
    if (fromUrl === "auto") {
      storage?.removeItem(OVERRIDE_STORAGE_KEY);
      return null;
    }
    if (fromUrl) {
      storage?.setItem(OVERRIDE_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = parseKioskRotateParam(
      storage?.getItem(OVERRIDE_STORAGE_KEY)
    );
    return stored && stored !== "auto" ? stored : null;
  } catch {
    return fromUrl && fromUrl !== "auto" ? fromUrl : null;
  }
}

/** 틀에 담을 주소. rotate 덮어쓰기 표시는 뺀다. */
export function kioskFrameSource(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const params = new URLSearchParams(location.search);
  params.delete("rotate");
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}

/** 마지막으로 받은 설정. 다음에 열 때 서버 답을 기다리지 않고 바로 쓴다. */
export function readCachedKioskDisplaySettings(
  storage: StorageLike | null = safeStorage(() => window.localStorage)
): KioskDisplaySettings | null {
  try {
    const raw = storage?.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalizeKioskDisplaySettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeCachedKioskDisplaySettings(
  settings: KioskDisplaySettings,
  storage: StorageLike | null = safeStorage(() => window.localStorage)
) {
  try {
    storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 저장할 수 없으면 매번 서버 답을 기다린다.
  }
}
