import React, { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { KioskKeyboard } from "./KioskKeyboard";

type Field = ComponentProps<typeof KioskKeyboard>["field"];

function renderKeyboard(overrides: Partial<Field> = {}) {
  const field: Field = {
    id: "test-keyboard",
    label: "시험 입력",
    defaultMode: "ko",
    variant: "full",
    multiline: false,
    alignToTop: false,
    submitDisabled: false,
    submitLabel: "검색",
    elementRef: { current: null },
    getValue: () => "",
    setValue: vi.fn(),
    ...overrides,
  };
  return renderToStaticMarkup(
    createElement(KioskKeyboard, {
      field,
      onClose: vi.fn(),
      onHeightChange: vi.fn(),
    })
  );
}

function labels(markup: string) {
  return [...markup.matchAll(/<button\b[^>]*aria-label="([^"]*)"/g)].map(
    match => match[1]
  );
}

describe("field-specific kiosk keyboard", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("renders only Korean letters and essential controls for name search", () => {
    const markup = renderKeyboard({ variant: "korean-name" });
    const allowed = [
      ..."ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ",
      "쌍자음 전환",
      "한 글자 지우기",
      "띄어쓰기",
      "검색",
      "화면 키보드 닫기",
    ];
    expect(labels(markup).sort()).toEqual(allowed.sort());
    expect(markup.match(/class="kiosk-keyboard-row\b/g)).toHaveLength(3);
    expect(markup).toContain('data-keyboard-variant="korean-name"');
  });

  it.each(["ko", "en", "number", "symbol"] as const)(
    "renders only digits for number-only fields such as the family room password (%s)",
    defaultMode => {
      const markup = renderKeyboard({
        variant: "digits",
        defaultMode,
        submitLabel: "비밀번호 확인",
      });
      const allowed = [
        ..."0123456789",
        "한 글자 지우기",
        "비밀번호 확인",
        "화면 키보드 닫기",
      ];
      expect(labels(markup).sort()).toEqual(allowed.sort());
      expect(markup).toContain('data-keyboard-variant="digits"');
    }
  );

  it.each(["en", "number", "symbol"] as const)(
    "does not leak %s mode into the Korean name keyboard",
    defaultMode => {
      const keys = labels(
        renderKeyboard({ variant: "korean-name", defaultMode })
      );
      expect(keys).toContain("ㄱ");
      for (const label of ["1", "!", "q", "영문", "숫자", "기호"])
        expect(keys).not.toContain(label);
    }
  );

  it.each([
    ["ko", "ㄱ"],
    ["en", "q"],
    ["number", "1"],
    ["symbol", "!"],
  ] as const)(
    "preserves %s keys and all mode switches for ordinary fields",
    (defaultMode, key) => {
      const keys = labels(
        renderKeyboard({
          defaultMode,
          multiline: true,
          submitLabel: "편지 남기기",
        })
      );
      for (const label of [
        key,
        "한글",
        "영문",
        "숫자",
        "기호",
        "줄바꿈",
        "띄어쓰기",
        "편지 남기기",
      ])
        expect(keys).toContain(label);
    }
  );
});
