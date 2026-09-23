import type { AddressInfo } from "net";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  cspMode,
  registerCspReportRoute,
  summarizeCspReport,
} from "./securityHeaders";

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

describe("어긋남 알림", () => {
  const report = (overrides: Record<string, string> = {}) => ({
    "csp-report": {
      "document-uri":
        "https://somangmemorial.co.kr/reset-password?token=secret-token#x",
      "effective-directive": "img-src",
      "violated-directive": "img-src 'self' data: blob: https:",
      "blocked-uri": "http://old.example.com/a.jpg?key=1",
      ...overrides,
    },
  });

  it("주소의 ? 뒤(재설정 열쇠 등)는 버리고 필요한 것만 남긴다", () => {
    const summary = summarizeCspReport(report());
    expect(summary).toEqual({
      directive: "img-src",
      blocked: "http://old.example.com/a.jpg",
      page: "/reset-password",
    });
    expect(JSON.stringify(summary)).not.toContain("secret-token");
  });

  it("추모관·초대 주소 칸은 가리고, 인라인 같은 표시는 그대로 둔다", () => {
    const summary = summarizeCspReport(
      report({
        "document-uri": "https://somangmemorial.co.kr/memorial/김소망",
        "blocked-uri": "inline",
        "effective-directive": "script-src-elem",
      })
    );
    expect(summary?.page).toBe("/memorial/*");
    expect(
      summarizeCspReport(
        report({
          "document-uri":
            "https://somangmemorial.co.kr/memorial/kim-somang/archive",
        })
      )?.page
    ).toBe("/memorial/*/archive");
    expect(
      summarizeCspReport(
        report({ "document-uri": "https://somangmemorial.co.kr/invite/abc123" })
      )?.page
    ).toBe("/invite/*");
    expect(
      summarizeCspReport(
        report({
          "document-uri": "https://somangmemorial.co.kr/memorial/search",
        })
      )?.page
    ).toBe("/memorial/search");
    expect(summary?.blocked).toBe("inline");
  });

  it("모양이 다른 알림은 버린다", () => {
    expect(summarizeCspReport(null)).toBeNull();
    expect(summarizeCspReport({ other: 1 })).toBeNull();
    expect(summarizeCspReport({ "csp-report": {} })).toBeNull();
  });

  it("브라우저 알림(application/csp-report)을 받아 한 줄로 남긴다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = express();
    registerCspReportRoute(app);
    const server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    try {
      const port = (server.address() as AddressInfo).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/csp-report`, {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: JSON.stringify(report()),
      });
      expect(res.status).toBe(204);
      expect(warn).toHaveBeenCalledWith(
        "[CSP] img-src blocked=http://old.example.com/a.jpg page=/reset-password"
      );
    } finally {
      warn.mockRestore();
      await new Promise(resolve => server.close(resolve));
    }
  });
});
