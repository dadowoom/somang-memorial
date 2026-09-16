import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import {
  KIOSK_SAMPLE_MEMORIAL_SLUG,
  kioskSampleMemorialPath,
} from "@/lib/kioskQuickActions";
import GuideContent from "@/components/guide/GuideContent";
import {
  KIOSK_GUIDE_LOADING_TEXT,
  KioskGuideOverlay,
  KioskQuickActions,
} from "./KioskQuickActions";

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
  it("예시 보기·이용 안내·문의 동그라미 단추 세 개를 세로로 놓는다", () => {
    const html = renderToStaticMarkup(
      createElement(KioskQuickActions, {
        onSample: () => {},
        onGuide: () => {},
        onInquiry: () => {},
      })
    );
    const buttons = html.match(/<button\b/g) ?? [];
    expect(buttons).toHaveLength(3);
    expect(html).toContain('class="kiosk-quick-actions"');
    expect(text(html)).toContain("예시 보기");
    expect(text(html)).toContain("이용 안내");
    expect(text(html)).toContain("문의");
  });

  it("견본 추모관 주소는 키오스크 안의 주소다 (일반 웹으로 새지 않는다)", () => {
    expect(kioskSampleMemorialPath()).toBe(
      `/kiosk/memorial/${KIOSK_SAMPLE_MEMORIAL_SLUG}`
    );
    expect(kioskSampleMemorialPath().startsWith("/kiosk/")).toBe(true);
  });
});

describe("KioskGuideOverlay", () => {
  it("전체 화면 창에 닫기 단추와 본문 자리가 있고, 본문은 눌렀을 때 내려받는다", () => {
    const html = renderToStaticMarkup(
      createElement(KioskGuideOverlay, { onClose: () => {} })
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="안내 닫기"');
    expect(text(html)).toContain("확인했습니다");
    // 아직 내려받기 전이라 자리 표시 문구가 보인다.
    expect(text(html)).toContain(KIOSK_GUIDE_LOADING_TEXT);
    expect(html).toContain("guide-page--kiosk");
  });
});

describe("GuideContent (키오스크 변형)", () => {
  function render(variant: "web" | "kiosk") {
    return renderToStaticMarkup(
      createElement(
        Router,
        { hook: () => ["/guide", () => {}] } as never,
        createElement(GuideContent, { variant })
      )
    );
  }

  it("홈페이지와 같은 본문(다섯 장)을 보여 준다", () => {
    const html = render("kiosk");
    for (const heading of [
      "이용 안내 · 소망이 있는 곳",
      "가족 전용 공간",
      "만드는 순서",
      "인생화원",
      "시작하기 전에",
    ]) {
      expect(text(html)).toContain(heading);
    }
  });

  it("키오스크에서는 다른 화면으로 가는 단추가 없다 (웹에는 있다)", () => {
    const kiosk = render("kiosk");
    const web = render("web");
    for (const href of [
      'href="/memorial/create"',
      'href="/memorial/search"',
      'href="/letters"',
      'href="/services/life-garden"',
    ]) {
      expect(kiosk).not.toContain(href);
      expect(web).toContain(href);
    }
    // "회원가입 · 로그인"은 만드는 순서를 설명하는 글이라 남아도 되지만, 로그인 화면으로 가는 링크는 없어야 한다.
    expect(kiosk).not.toContain('href="/login"');
    expect(kiosk).not.toContain('href="/signup"');
  });
});
