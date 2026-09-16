import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  KIOSK_GUIDE_STEPS,
  KIOSK_SAMPLE_MEMORIAL_SLUG,
  kioskSampleMemorialPath,
} from "@/lib/kioskQuickActions";
import { KioskGuideOverlay, KioskQuickActions } from "./KioskQuickActions";

// Kiosk.test.ts 와 같다: Node Vitest 설정에는 React JSX 플러그인이 없다.
beforeAll(() => {
  vi.stubGlobal("React", React);
});

function text(markup: string) {
  return markup
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("KioskQuickActions", () => {
  it("예시 보기·이용 안내 동그라미 단추 두 개를 세로로 놓는다", () => {
    const html = renderToStaticMarkup(
      createElement(KioskQuickActions, {
        onSample: () => {},
        onGuide: () => {},
      })
    );
    const buttons = html.match(/<button\b/g) ?? [];
    expect(buttons).toHaveLength(2);
    expect(html).toContain('class="kiosk-quick-actions"');
    expect(text(html)).toContain("예시 보기");
    expect(text(html)).toContain("이용 안내");
  });

  it("견본 추모관 주소는 키오스크 안의 주소다 (일반 웹으로 새지 않는다)", () => {
    expect(kioskSampleMemorialPath()).toBe(
      `/kiosk/memorial/${KIOSK_SAMPLE_MEMORIAL_SLUG}`
    );
    expect(kioskSampleMemorialPath().startsWith("/kiosk/")).toBe(true);
  });
});

describe("KioskGuideOverlay", () => {
  it("안내 순서를 전부 보여 주고 닫는 길이 있다", () => {
    const html = renderToStaticMarkup(
      createElement(KioskGuideOverlay, { onClose: () => {} })
    );
    expect(html).toContain('role="dialog"');
    for (const step of KIOSK_GUIDE_STEPS) {
      expect(text(html)).toContain(step.title);
    }
    expect(text(html)).toContain("확인했습니다");
    expect(html).toContain('aria-label="안내 닫기"');
    // 로그인·메뉴 같은 일반 웹 요소는 없어야 한다.
    expect(html).not.toContain("로그인");
    expect(html).not.toContain('href="/"');
  });
});
