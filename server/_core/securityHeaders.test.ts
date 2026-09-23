import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, cspMode } from "./securityHeaders";

// 콘텐츠 보안 정책 (2026-09-23, 계획서 L-6).
describe("콘텐츠 보안 정책", () => {
  it("운영은 처음에 기록만 하고, 개발 서버는 끈다", () => {
    expect(cspMode({ NODE_ENV: "production" })).toBe("report-only");
    expect(cspMode({ NODE_ENV: "development" })).toBe("off");
    expect(cspMode({ NODE_ENV: "production", CSP_MODE: "enforce" })).toBe(
      "enforce"
    );
    expect(cspMode({ NODE_ENV: "production", CSP_MODE: "off" })).toBe("off");
    expect(cspMode({ NODE_ENV: "production", CSP_MODE: "이상한값" })).toBe(
      "report-only"
    );
  });

  it("스크립트는 우리 사이트 것만, 영상 틀은 유튜브만 허락한다", () => {
    const rules = Object.fromEntries(
      CONTENT_SECURITY_POLICY.split("; ").map(rule => {
        const [name, ...values] = rule.split(" ");
        return [name, values];
      })
    );
    expect(rules["script-src"]).toEqual(["'self'"]);
    expect(rules["object-src"]).toEqual(["'none'"]);
    expect(rules["frame-src"]).toEqual([
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ]);
    expect(rules["font-src"]).toContain("https://fonts.gstatic.com");
    expect(rules["frame-ancestors"]).toEqual(["'self'"]);
  });
});
