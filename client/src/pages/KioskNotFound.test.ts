import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import KioskNotFound, { KIOSK_NOT_FOUND_RETURN_MS } from "./KioskNotFound";

// Kiosk.test.ts 와 같다: Node Vitest 설정에는 React JSX 플러그인이 없다.
beforeAll(() => {
  vi.stubGlobal("React", React);
});

describe("KioskNotFound", () => {
  it("메뉴·로그인 없이 처음으로 가는 길만 보여 준다", () => {
    const html = renderToStaticMarkup(
      createElement(
        Router,
        { hook: () => ["/kiosk/oops", () => {}] } as never,
        createElement(KioskNotFound)
      )
    );
    expect(html).toContain("화면을 찾지 못했습니다");
    expect(html).toContain("처음으로");
    expect(html).not.toContain("로그인");
    expect(html).not.toContain('href="/"');
  });

  it("15초 안에 스스로 돌아간다 (검색 화면 90초보다 짧다)", () => {
    expect(KIOSK_NOT_FOUND_RETURN_MS).toBe(15_000);
    expect(KIOSK_NOT_FOUND_RETURN_MS).toBeLessThan(90_000);
  });
});
