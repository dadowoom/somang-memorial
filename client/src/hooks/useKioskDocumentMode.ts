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
 */
export const KIOSK_DOCUMENT_CLASS = "kiosk-mode";

export function preventKioskContextMenu(event: Pick<Event, "preventDefault">) {
  event.preventDefault();
}

export function useKioskDocumentMode() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(KIOSK_DOCUMENT_CLASS);
    document.addEventListener("contextmenu", preventKioskContextMenu);
    return () => {
      root.classList.remove(KIOSK_DOCUMENT_CLASS);
      document.removeEventListener("contextmenu", preventKioskContextMenu);
    };
  }, []);
}
