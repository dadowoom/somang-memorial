import { describe, expect, it, vi } from "vitest";
import {
  KIOSK_DOCUMENT_CLASS,
  preventKioskContextMenu,
  preventKioskZoomKeys,
  preventKioskZoomWheel,
} from "./useKioskDocumentMode";

describe("useKioskDocumentMode", () => {
  it("키오스크 표시 이름은 index.css 와 같다", () => {
    expect(KIOSK_DOCUMENT_CLASS).toBe("kiosk-mode");
  });

  it("길게 눌러 뜨는 메뉴를 막는다", () => {
    const event = { preventDefault: vi.fn() };
    preventKioskContextMenu(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("Ctrl + 휠(두 손가락 오므리기)로 확대하지 못하게 하고, 그냥 휠은 둔다", () => {
    const zoom = { ctrlKey: true, preventDefault: vi.fn() };
    const scroll = { ctrlKey: false, preventDefault: vi.fn() };
    preventKioskZoomWheel(zoom);
    preventKioskZoomWheel(scroll);
    expect(zoom.preventDefault).toHaveBeenCalledOnce();
    expect(scroll.preventDefault).not.toHaveBeenCalled();
  });

  it("Ctrl + 더하기·빼기·0 확대 키를 막고, 글자 입력은 둔다", () => {
    const zoomIn = {
      ctrlKey: true,
      metaKey: false,
      key: "=",
      preventDefault: vi.fn(),
    };
    const typing = {
      ctrlKey: false,
      metaKey: false,
      key: "0",
      preventDefault: vi.fn(),
    };
    preventKioskZoomKeys(zoomIn);
    preventKioskZoomKeys(typing);
    expect(zoomIn.preventDefault).toHaveBeenCalledOnce();
    expect(typing.preventDefault).not.toHaveBeenCalled();
  });
});
