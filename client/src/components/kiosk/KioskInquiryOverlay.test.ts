import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CHURCH_INQUIRY, COMPANY_INQUIRY } from "@/lib/kioskInquiry";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  fieldOptions: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    kioskInquiry: {
      submit: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.mutateAsync,
        }),
      },
    },
  },
}));

vi.mock("@/components/kiosk/KioskKeyboard", () => ({
  useKioskKeyboard: () => ({ isOpen: false, keyboardHeight: 0 }),
  useKioskKeyboardField: (options: unknown) => {
    mocks.fieldOptions(options);
    return {
      ref: { current: null },
      inputMode: "none",
      onFocus: vi.fn(),
      onClick: vi.fn(),
      keyboardOpen: false,
    };
  },
}));

import KioskInquiryOverlay from "./KioskInquiryOverlay";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

function text(markup: string) {
  return markup
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("KioskInquiryOverlay", () => {
  it("교회 경조부 안내(전화번호)와 제작 업체 문의 양식을 반반으로 보여 준다", () => {
    const html = renderToStaticMarkup(
      createElement(KioskInquiryOverlay, { onClose: () => {} })
    );
    const body = text(html);
    expect(html).toContain('role="dialog"');
    expect(body).toContain(CHURCH_INQUIRY.title);
    expect(body).toContain(CHURCH_INQUIRY.phone);
    expect(body).toContain(COMPANY_INQUIRY.title);
    expect(body).toContain(COMPANY_INQUIRY.submitLabel);
    expect(body).toContain(COMPANY_INQUIRY.consent);
    expect((html.match(/class="kiosk-inquiry-half( |")/g) ?? []).length).toBe(
      2
    );
    // 웹으로 새는 링크는 없다.
    expect(html).not.toContain("href=");
  });

  it("전화번호 칸은 숫자 자판으로, 성함 칸은 한글 이름 자판으로 연다", () => {
    renderToStaticMarkup(
      createElement(KioskInquiryOverlay, { onClose: () => {} })
    );
    const options = mocks.fieldOptions.mock.calls.map(
      call => call[0] as { id: string; defaultMode?: string; variant?: string }
    );
    expect(options.find(o => o.id === "kiosk-inquiry-phone")?.defaultMode).toBe(
      "number"
    );
    expect(options.find(o => o.id === "kiosk-inquiry-name")?.variant).toBe(
      "korean-name"
    );
  });
});
