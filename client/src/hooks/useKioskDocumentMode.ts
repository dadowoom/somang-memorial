import { useEffect } from "react";

/**
 * 키오스크 화면에서만 문서 전체(html)에 거는 표시 (2026-09-16).
 *
 * 터치 화면에서 손가락을 좌우로 밀면 크롬이 화면 양옆에 "뒤로/앞으로" 화살표를
 * 띄우고, 끝까지 밀면 이전 화면으로 넘어가 버린다. 위에서 아래로 당기면 새로고침
 * 표시가 뜬다. 키오스크 PC 실행 설정(--overscroll-history-navigation=0)은 요즘
 * 크롬에서 듣지 않아, 화면 쪽에서 막는다. 스타일은 index.css 의 html.kiosk-mode.
 *
 * 길게 누르면 뜨는 오른쪽 클릭 메뉴(뒤로 가기·인쇄 등)도 여기서 막는다.
 *
 * 두 손가락 확대는 index.css 의 touch-action(pan-x pan-y)이 막는다. 여기서는
 * 그 밖의 확대 통로를 막는다 (2026-09-16 현장 요청).
 * - 터치 화면·터치패드의 오므리기는 윈도우에서 Ctrl + 휠로 들어오기도 한다.
 * - 사파리 계열은 gesturestart 로 확대한다.
 * - Ctrl + 더하기/빼기/0 키 확대.
 */
export const KIOSK_DOCUMENT_CLASS = "kiosk-mode";

export function preventKioskContextMenu(event: Pick<Event, "preventDefault">) {
  event.preventDefault();
}

export function preventKioskZoomWheel(
  event: Pick<WheelEvent, "ctrlKey" | "preventDefault">
) {
  if (event.ctrlKey) event.preventDefault();
}

export function preventKioskGesture(event: Pick<Event, "preventDefault">) {
  event.preventDefault();
}

const ZOOM_KEYS = new Set(["+", "=", "-", "_", "0"]);

export function preventKioskZoomKeys(
  event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "key" | "preventDefault">
) {
  if ((event.ctrlKey || event.metaKey) && ZOOM_KEYS.has(event.key)) {
    event.preventDefault();
  }
}

export function useKioskDocumentMode() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(KIOSK_DOCUMENT_CLASS);
    document.addEventListener("contextmenu", preventKioskContextMenu);
    document.addEventListener("wheel", preventKioskZoomWheel, {
      passive: false,
    });
    document.addEventListener("gesturestart", preventKioskGesture);
    document.addEventListener("gesturechange", preventKioskGesture);
    document.addEventListener("keydown", preventKioskZoomKeys);
    return () => {
      root.classList.remove(KIOSK_DOCUMENT_CLASS);
      document.removeEventListener("contextmenu", preventKioskContextMenu);
      document.removeEventListener("wheel", preventKioskZoomWheel);
      document.removeEventListener("gesturestart", preventKioskGesture);
      document.removeEventListener("gesturechange", preventKioskGesture);
      document.removeEventListener("keydown", preventKioskZoomKeys);
    };
  }, []);
}
