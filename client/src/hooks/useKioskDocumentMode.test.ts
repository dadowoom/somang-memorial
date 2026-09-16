import { describe, expect, it, vi } from "vitest";
import {
  KIOSK_DOCUMENT_CLASS,
  preventKioskContextMenu,
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
});
