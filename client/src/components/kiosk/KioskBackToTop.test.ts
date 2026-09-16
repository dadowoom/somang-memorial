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
  it("30초 동안 아무도 만지지 않으면 시작한다 (2026-09-16 저녁 현장 결정)", () => {
    expect(KIOSK_ATTRACT_IDLE_MS).toBe(30_000);
    // 검색 초기화(90초)보다 먼저 온다. 광고가 떠 있어도 초기화는 그대로 된다.
    expect(KIOSK_ATTRACT_IDLE_MS).toBeLessThan(KIOSK_IDLE_RESET_MS);
  });
});
