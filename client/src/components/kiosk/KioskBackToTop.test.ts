import { describe, expect, it } from "vitest";
import {
  KIOSK_BACK_TO_TOP_AFTER_PX,
  shouldShowKioskBackToTop,
} from "./KioskBackToTop";
import { KIOSK_ATTRACT_IDLE_MS } from "@/lib/kioskAttract";
import { KIOSK_IDLE_RESET_MS } from "@/hooks/useKioskIdleReset";

describe("shouldShowKioskBackToTop", () => {
  it("맨 위에서는 숨기고, 내려가면 보여 준다", () => {
    expect(shouldShowKioskBackToTop(0, false)).toBe(false);
    expect(shouldShowKioskBackToTop(KIOSK_BACK_TO_TOP_AFTER_PX, false)).toBe(
      false
    );
    expect(
      shouldShowKioskBackToTop(KIOSK_BACK_TO_TOP_AFTER_PX + 1, false)
    ).toBe(true);
  });

  it("자판이 올라와 있으면 숨긴다", () => {
    expect(shouldShowKioskBackToTop(2000, true)).toBe(false);
  });
});

describe("광고(대기) 화면 시작 시점", () => {
  it("5분 동안 아무도 만지지 않을 때 시작한다 (검색 초기화 90초보다 길다)", () => {
    expect(KIOSK_ATTRACT_IDLE_MS).toBe(5 * 60_000);
    expect(KIOSK_ATTRACT_IDLE_MS).toBeGreaterThan(KIOSK_IDLE_RESET_MS);
  });
});
