import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Footer from "./Footer";

// 사이트 하단 연락처는 소망교회 경조부 번호 하나다 (2026-09-17 사용자 결정).
describe("site footer contact", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("shows the funeral office phone as a tap-to-call link", () => {
    const markup = renderToStaticMarkup(
      createElement(Router, { ssrPath: "/" }, createElement(Footer))
    );
    expect(markup).toContain('href="tel:02-541-3726"');
    expect(markup).toContain("경조부 02-541-3726");
    expect(markup).not.toContain("031-764");
  });
});
