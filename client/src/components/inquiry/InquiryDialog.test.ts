import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { COMPANY_INQUIRY, WEB_INQUIRY } from "@/lib/kioskInquiry";

// 홈페이지 "문의하기" 창 (2026-09-17). 키오스크 문의 창 시험과 같은 방식으로 그려 본다.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    kioskInquiry: {
      submit: {
        useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
      },
    },
  },
}));

import InquiryDialog from "./InquiryDialog";
import SampleInquiryFab from "./SampleInquiryFab";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

describe("InquiryDialog", () => {
  it("전화번호·성함 칸과 동의 글, 경조부 번호가 있는 창이다", () => {
    const html = renderToStaticMarkup(
      createElement(InquiryDialog, { onClose: () => {} })
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(WEB_INQUIRY.title);
    expect(html).toContain('type="tel"');
    expect(html).toMatch(/inputmode="numeric"/i);
    expect(html).toContain(COMPANY_INQUIRY.submitLabel);
    expect(html).toContain(COMPANY_INQUIRY.consent);
    expect(html).toContain('href="tel:010-5307-4404"');
  });
});

describe("SampleInquiryFab", () => {
  it("처음에는 문의하기 동그라미만 보이고 창은 닫혀 있다", () => {
    const html = renderToStaticMarkup(createElement(SampleInquiryFab));
    expect(html).toContain('class="sample-inquiry-fab"');
    expect(html).toContain("문의하기");
    expect(html).not.toContain('role="dialog"');
  });
});
