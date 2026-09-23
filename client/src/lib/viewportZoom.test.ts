import { describe, expect, it } from "vitest";
import {
  VIEWPORT_BASE,
  VIEWPORT_IOS,
  viewportContentFor,
} from "./viewportZoom";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";
const KAKAO_ANDROID = `${ANDROID} KAKAOTALK 10.8.0`;
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

describe("휴대폰 두 손가락 확대", () => {
  it("안드로이드(카카오톡 안 창 포함)는 확대를 막지 않는다", () => {
    expect(viewportContentFor(ANDROID, 5)).toBe(VIEWPORT_BASE);
    expect(viewportContentFor(KAKAO_ANDROID, 5)).toBe(VIEWPORT_BASE);
    expect(VIEWPORT_BASE).not.toContain("maximum-scale");
  });

  it("아이폰·아이패드는 입력칸 자동 확대만 막는 값을 쓴다", () => {
    expect(viewportContentFor(IPHONE, 5)).toBe(VIEWPORT_IOS);
    expect(viewportContentFor(IPAD_AS_MAC, 5)).toBe(VIEWPORT_IOS);
  });

  it("터치 없는 맥과 윈도우 PC는 기본값", () => {
    expect(viewportContentFor(IPAD_AS_MAC, 0)).toBe(VIEWPORT_BASE);
    expect(viewportContentFor(WINDOWS, 10)).toBe(VIEWPORT_BASE);
  });
});
