import { describe, expect, it } from "vitest";
import {
  KIOSK_BROWSER_SUMMARY_PATTERN,
  decideKioskRotation,
  kioskFramePointToScreen,
  kioskRotateReasonLabel,
  kioskRotationFrameStyle,
  normalizeKioskDisplaySettings,
  parseKioskRotateParam,
  summarizeUserAgent,
} from "./kioskDisplay";

const on = { portraitLock: true, direction: "ccw" } as const;
const off = { portraitLock: false, direction: "ccw" } as const;

describe("decideKioskRotation", () => {
  it("설정이 켜져 있고 창이 가로이면 설정 방향으로 돌린다", () => {
    expect(
      decideKioskRotation({
        settings: on,
        override: null,
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: "ccw", reason: "rotated" });
    expect(
      decideKioskRotation({
        settings: { portraitLock: true, direction: "cw" },
        override: null,
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: "cw", reason: "rotated" });
  });

  it("창이 이미 세로이면 켜져 있어도 돌리지 않는다 (이중 회전 금지)", () => {
    expect(
      decideKioskRotation({
        settings: on,
        override: null,
        width: 1080,
        height: 1920,
      })
    ).toEqual({ rotation: null, reason: "already-portrait" });
    expect(
      decideKioskRotation({
        settings: on,
        override: "cw",
        width: 1080,
        height: 1920,
      })
    ).toEqual({ rotation: null, reason: "already-portrait" });
    expect(
      decideKioskRotation({
        settings: on,
        override: null,
        width: 1000,
        height: 1000,
      })
    ).toEqual({ rotation: null, reason: "already-portrait" });
  });

  it("설정이 꺼져 있거나 아직 모르면 지금처럼 그린다", () => {
    expect(
      decideKioskRotation({
        settings: off,
        override: null,
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: null, reason: "setting-off" });
    expect(
      decideKioskRotation({
        settings: null,
        override: null,
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: null, reason: "setting-off" });
  });

  it("주소 덮어쓰기가 설정보다 먼저다", () => {
    expect(
      decideKioskRotation({
        settings: on,
        override: "off",
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: null, reason: "off-by-url" });
    expect(
      decideKioskRotation({
        settings: off,
        override: "cw",
        width: 1920,
        height: 1080,
      })
    ).toEqual({ rotation: "cw", reason: "rotated-by-url" });
  });

  it("화면 배율을 크게 잡은 작은 가로 창도 돌린다", () => {
    expect(
      decideKioskRotation({
        settings: on,
        override: null,
        width: 960,
        height: 540,
      })
    ).toEqual({ rotation: "ccw", reason: "rotated" });
    expect(kioskRotateReasonLabel("rotated")).toBe("세로 고정 적용 중");
  });
});

/** transform 문자열을 직접 계산해 점이 어디로 가는지 본다. */
function applyTransform(
  transform: string,
  box: { width: number; height: number },
  point: { x: number; y: number }
) {
  // 오른쪽 함수부터 점에 적용된다.
  const steps = Array.from(
    transform.matchAll(/(rotate|translateX|translateY)\(([-\d.]+)(deg|%)\)/g)
  ).reverse();
  let { x, y } = point;
  for (const [, fn, raw] of steps) {
    const value = Number(raw);
    if (fn === "translateX") x += (box.width * value) / 100;
    if (fn === "translateY") y += (box.height * value) / 100;
    if (fn === "rotate") {
      const rad = (value * Math.PI) / 180;
      const cos = Math.round(Math.cos(rad));
      const sin = Math.round(Math.sin(rad));
      [x, y] = [x * cos - y * sin, x * sin + y * cos];
    }
  }
  return { x, y };
}

describe("kioskRotationFrameStyle", () => {
  const viewport = { width: 1920, height: 1080 };

  for (const rotation of ["ccw", "cw"] as const) {
    it(`${rotation}: 상자는 세로(1080×1920)이고 돌린 뒤 화면을 꼭 채운다`, () => {
      const style = kioskRotationFrameStyle(rotation, viewport);
      expect(style.width).toBe(1080);
      expect(style.height).toBe(1920);
      expect(style.transformOrigin).toBe("0 0");
      const box = { width: style.width, height: style.height };
      const corners = [
        { x: 0, y: 0 },
        { x: box.width, y: 0 },
        { x: 0, y: box.height },
        { x: box.width, y: box.height },
      ].map(point => applyTransform(style.transform, box, point));
      const xs = corners.map(point => point.x);
      const ys = corners.map(point => point.y);
      expect(Math.min(...xs)).toBeCloseTo(0);
      expect(Math.max(...xs)).toBeCloseTo(1920);
      expect(Math.min(...ys)).toBeCloseTo(0);
      expect(Math.max(...ys)).toBeCloseTo(1080);

      // 시험에서 누를 자리를 계산하는 함수도 같은 답을 낸다.
      for (const point of [
        { x: 100, y: 300 },
        { x: 540, y: 960 },
        { x: 1000, y: 1800 },
      ]) {
        const expected = applyTransform(style.transform, box, point);
        const actual = kioskFramePointToScreen(rotation, point, viewport);
        expect(actual.x).toBeCloseTo(expected.x);
        expect(actual.y).toBeCloseTo(expected.y);
      }
    });
  }

  it("반시계(ccw)는 세로 화면의 위쪽이 실제 화면 왼쪽으로 간다", () => {
    const top = kioskFramePointToScreen("ccw", { x: 540, y: 0 }, viewport);
    expect(top).toEqual({ x: 0, y: 540 });
    const cwTop = kioskFramePointToScreen("cw", { x: 540, y: 0 }, viewport);
    expect(cwTop).toEqual({ x: 1920, y: 540 });
  });
});

describe("parseKioskRotateParam / normalizeKioskDisplaySettings", () => {
  it("cw·ccw·off·auto 만 받는다", () => {
    expect(parseKioskRotateParam("CW")).toBe("cw");
    expect(parseKioskRotateParam(" ccw ")).toBe("ccw");
    expect(parseKioskRotateParam("off")).toBe("off");
    expect(parseKioskRotateParam("auto")).toBe("auto");
    expect(parseKioskRotateParam("90")).toBeNull();
    expect(parseKioskRotateParam(null)).toBeNull();
  });

  it("이상한 값은 꺼짐·반시계로 읽는다", () => {
    expect(normalizeKioskDisplaySettings(null)).toEqual({
      portraitLock: false,
      direction: "ccw",
    });
    expect(
      normalizeKioskDisplaySettings({ portraitLock: "true", direction: "up" })
    ).toEqual({ portraitLock: false, direction: "ccw" });
    expect(
      normalizeKioskDisplaySettings({ portraitLock: true, direction: "cw" })
    ).toEqual({ portraitLock: true, direction: "cw" });
  });
});

describe("summarizeUserAgent", () => {
  it("브라우저 이름·큰 판 번호·운영체제만 남긴다", () => {
    expect(
      summarizeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.55 Safari/537.36"
      )
    ).toBe("Chrome 141 · Windows");
    expect(
      summarizeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0"
      )
    ).toBe("Edge 141 · Windows");
    expect(
      summarizeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari 18 · iOS");
    expect(summarizeUserAgent("")).toBe("기타 브라우저");
    for (const ua of [
      "",
      "x".repeat(500),
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Mozilla/5.0 (X11; CrOS x86_64 15000.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99999.0 Safari/537.36",
    ]) {
      // 서버가 받는 모양과 늘 맞아야 한다.
      expect(summarizeUserAgent(ua)).toMatch(KIOSK_BROWSER_SUMMARY_PATTERN);
    }
    expect(summarizeUserAgent("x".repeat(500)).length).toBeLessThanOrEqual(40);
  });
});
