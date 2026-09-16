import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Router } from "wouter";
import Kiosk from "./Kiosk";

const mocks = vi.hoisted(() => ({
  keyboard: { isOpen: false, keyboardOpen: false, keyboardHeight: 0 },
  closeKeyboard: vi.fn(),
  onFocus: vi.fn(),
  onClick: vi.fn(),
  query: {
    data: [],
    isLoading: false,
    isError: false,
    isPaused: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  mutateAsync: vi.fn(),
  fieldOptions: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    kiosk: {
      memorialSearch: { useQuery: () => mocks.query },
      intermentSearch: { useQuery: () => mocks.query },
    },
    kioskPoster: {
      list: { useQuery: () => mocks.query },
    },
    memorial: {
      verifyAccess: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.mutateAsync,
        }),
      },
    },
  },
}));

vi.mock("@/components/kiosk/KioskKeyboard", () => ({
  useKioskKeyboard: () => ({
    isOpen: mocks.keyboard.isOpen,
    keyboardHeight: mocks.keyboard.keyboardHeight,
    closeKeyboard: mocks.closeKeyboard,
  }),
  useKioskKeyboardField: (options: unknown) => {
    mocks.fieldOptions(options);
    return {
      ref: { current: null },
      inputMode: "none",
      onFocus: mocks.onFocus,
      onClick: mocks.onClick,
      keyboardOpen: mocks.keyboard.keyboardOpen,
      closeKeyboard: mocks.closeKeyboard,
    };
  },
}));

vi.mock("@/hooks/useKioskIdleReset", () => ({
  KIOSK_IDLE_RESET_MS: 3 * 60_000,
  useKioskIdleReset: vi.fn(),
  clearBrowserKioskAccessStorage: vi.fn(),
  kioskAccessStorageKey: (slug: string) => `kiosk-access:${slug}`,
}));

function renderKiosk() {
  return renderToStaticMarkup(
    createElement(Router, { ssrPath: "/kiosk" }, createElement(Kiosk))
  );
}

function attribute(attributes: string, name: string) {
  return attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

function openingTags(markup: string) {
  return [...markup.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/g)].map(match => ({
    tag: match[1],
    attributes: match[2],
  }));
}

function expectSharedMinHeight(markup: string, expected: string) {
  const tags = openingTags(markup);
  const main = tags.filter(element => element.tag === "main");
  const shell = tags.filter(
    element =>
      element.tag === "div" &&
      attribute(element.attributes, "class")
        ?.split(/\s+/)
        .includes("kiosk-search-shell")
  );
  expect(main).toHaveLength(1);
  expect(shell).toHaveLength(1);

  for (const element of [...main, ...shell]) {
    const minHeight = attribute(element.attributes, "style")?.match(
      /(?:^|;)min-height:([^;]+)/
    )?.[1];
    expect(minHeight?.replace(/\s+/g, "")).toBe(expected.replace(/\s+/g, ""));
  }
}

function textContent(markup: string) {
  return markup
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("kiosk search viewport SSR regression", () => {
  it("selects the Korean-only keyboard for the name search field", () => {
    renderKiosk();
    expect(mocks.fieldOptions).toHaveBeenCalledWith(
      expect.objectContaining({ id: "kiosk-search", variant: "korean-name" })
    );
  });
  beforeAll(() => {
    // Match Home.test.ts: the Node Vitest configuration has no React JSX plugin.
    vi.stubGlobal("React", React);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.keyboard.isOpen = false;
    mocks.keyboard.keyboardOpen = false;
    mocks.keyboard.keyboardHeight = 0;
  });

  afterAll(() => vi.unstubAllGlobals());

  it.each([true, false])(
    "marks only the active search keyboard for the compact introduction: %s",
    keyboardOpen => {
      mocks.keyboard.isOpen = true;
      mocks.keyboard.keyboardOpen = keyboardOpen;
      const markup = renderKiosk();
      const main = openingTags(markup).find(element => element.tag === "main")!;
      expect(attribute(main.attributes, "data-search-keyboard-open")).toBe(
        String(keyboardOpen)
      );
      // Keep the guide in the DOM so CSS restores it on close and never hides
      // it on compact phone/landscape layouts.
      expect(textContent(markup)).toContain("추모관 이용 안내");
    }
  );

  it.each([1440, 1382.4, 1152, 819.6, 960, 683])(
    "shares the available viewport height with main and shell for a %spx keyboard",
    keyboardHeight => {
      Object.assign(mocks.keyboard, {
        isOpen: true,
        keyboardOpen: true,
        keyboardHeight,
      });

      expectSharedMinHeight(
        renderKiosk(),
        `max(0px, calc(100dvh - ${keyboardHeight}px))`
      );
    }
  );

  it("uses the full viewport before the search keyboard opens", () => {
    expectSharedMinHeight(renderKiosk(), "100dvh");
  });

  it("restores both full heights after closing even if the previous measurement remains", () => {
    Object.assign(mocks.keyboard, {
      isOpen: true,
      keyboardOpen: true,
      keyboardHeight: 960,
    });
    expectSharedMinHeight(renderKiosk(), "max(0px, calc(100dvh - 960px))");

    mocks.keyboard.isOpen = false;
    mocks.keyboard.keyboardOpen = false;
    expectSharedMinHeight(renderKiosk(), "100dvh");
  });

  it("does not shrink the search shell for another field's open keyboard", () => {
    Object.assign(mocks.keyboard, {
      isOpen: true,
      keyboardOpen: false,
      keyboardHeight: 683,
    });

    expectSharedMinHeight(renderKiosk(), "100dvh");
  });

  it("keeps the opening calculation valid before the first height measurement", () => {
    Object.assign(mocks.keyboard, {
      isOpen: true,
      keyboardOpen: true,
      keyboardHeight: 0,
    });

    expectSharedMinHeight(renderKiosk(), "max(0px, calc(100dvh - 0px))");
  });

  it("preserves the search heading, input contract and named submit button", () => {
    const markup = renderKiosk();
    const headings = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(headings).toHaveLength(1);
    expect(textContent(headings[0][1])).toBe("그리운 분을 찾아보세요");

    const tags = openingTags(markup);
    const inputs = tags.filter(element => element.tag === "input");
    expect(inputs).toHaveLength(1);
    expect(attribute(inputs[0].attributes, "placeholder")).toBe("예: 김소망");
    expect(attribute(inputs[0].attributes, "inputMode")).toBe("none");
    expect(attribute(inputs[0].attributes, "autoComplete")).toBe("off");
    expect(attribute(inputs[0].attributes, "maxLength")).toBe("80");
    expect(tags.filter(element => element.tag === "form")).toHaveLength(1);

    const submitButtons = [
      ...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
    ].filter(match => attribute(match[1], "type") === "submit");
    expect(submitButtons).toHaveLength(1);
    expect(textContent(submitButtons[0][2])).toBe("검색");
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });
});
