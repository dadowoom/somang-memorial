import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Home from "./Home";

// Keep these tests focused on the home page, without auth or navigation providers.
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

type Element = {
  tag: string;
  attributes: string;
  children: Array<Element | string>;
};

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function decodeEntities(value: string) {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&#x27;": "'",
    "&#39;": "'",
  };
  return value.replace(
    /&(amp|quot|apos|lt|gt|#x27|#39);/g,
    entity => entities[entity]
  );
}

// A small tokenizer for React's generated markup, not a browser HTML parser.
// Keeping the original hierarchy also catches invalid nested anchors/buttons
// that a browser parser would repair before a DOM assertion could inspect them.
function readMarkup(markup: string): Element {
  const root: Element = { tag: "root", attributes: "", children: [] };
  const stack = [root];
  for (const [token] of markup.matchAll(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)) {
    if (token.startsWith("<!--")) continue;
    const tag = token.match(/^<(\/?)([a-z][\w:-]*)\b([^>]*)>/i);
    if (!tag) {
      stack[stack.length - 1].children.push(decodeEntities(token));
    } else if (tag[1]) {
      expect(stack[stack.length - 1].tag).toBe(tag[2].toLowerCase());
      stack.pop();
    } else {
      const element: Element = {
        tag: tag[2].toLowerCase(),
        attributes: tag[3],
        children: [],
      };
      stack[stack.length - 1].children.push(element);
      if (!voidTags.has(element.tag) && !token.endsWith("/>"))
        stack.push(element);
    }
  }
  expect(stack).toHaveLength(1);
  return root;
}

function attribute(element: Element, name: string) {
  const match = element.attributes.match(
    new RegExp(`(?:^|\\s)${name}="([^"]*)"`)
  );
  return match ? decodeEntities(match[1]) : undefined;
}

function elements(root: Element): Element[] {
  return [
    root,
    ...root.children.flatMap(child =>
      typeof child === "string" ? [] : elements(child)
    ),
  ];
}

function textContent(node: Element | string): string {
  if (typeof node === "string") return node;
  if (attribute(node, "aria-hidden") === "true") return "";
  if (node.tag === "img") return attribute(node, "alt") ?? "";
  return node.children.map(textContent).join("");
}

function name(element: Element) {
  return (attribute(element, "aria-label") ?? textContent(element))
    .replace(/\s+/g, " ")
    .trim();
}

function isInteractive(element: Element) {
  return (
    (element.tag === "a" && attribute(element, "href") !== undefined) ||
    ["button", "select", "textarea", "summary"].includes(element.tag) ||
    (element.tag === "input" && attribute(element, "type") !== "hidden") ||
    ["button", "link"].includes(attribute(element, "role") ?? "")
  );
}

describe("home page SSR regression", () => {
  let main: Element;
  let content: Element[];

  beforeAll(() => {
    // The existing Node Vitest config has no React plugin; support classic JSX
    // transforms in the imported TSX without changing production components.
    vi.stubGlobal("React", React);
    const markup = renderToStaticMarkup(
      createElement(Router, { ssrPath: "/" }, createElement(Home))
    );
    const mains = elements(readMarkup(markup)).filter(
      element => element.tag === "main"
    );
    expect(mains).toHaveLength(1);
    main = mains[0];
    content = elements(main);
  });

  afterAll(() => vi.unstubAllGlobals());

  it("renders one named main heading and labels the hero with it", () => {
    const headings = content.filter(element => element.tag === "h1");
    expect(headings).toHaveLength(1);
    expect(name(headings[0])).toBe("“나는 부활이요 생명이니”");
    const headingId = attribute(headings[0], "id");
    expect(headingId).toBeTruthy();
    expect(
      content.some(
        element =>
          element.tag === "section" &&
          attribute(element, "aria-labelledby") === headingId
      )
    ).toBe(true);
  });

  it("keeps the verse as readable text without forced line-break wrappers", () => {
    const heading = content.find(element => element.tag === "h1")!;
    expect(heading.children).toEqual(["“나는 부활이요 생명이니”"]);
  });

  it.each([
    ["/memorial/search", "추모관 찾기"],
    ["/memorial/create", "추모관 만들기"],
    ["/login?redirect=/my/find-parent&mode=signup", "우리 부모님 찾기"],
    // 인생화원 카드는 예시 추모관으로 간다 (2026-09-17).
    ["/memorial/kim-somang-kwonsa", "인생화원 예시 보기"],
  ])("preserves the destination and readable name of %s", (href, label) => {
    const links = content.filter(
      element => element.tag === "a" && attribute(element, "href") === href
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(name(link)).toBe(label);
  });

  it.each(["memorials", "services", "process", "membership"])(
    "preserves the unique #%s section and its heading association",
    id => {
      const matches = content.filter(
        element => attribute(element, "id") === id
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].tag).toBe("section");
      const labelId = attribute(matches[0], "aria-labelledby");
      expect(labelId).toBeTruthy();
      const headings = elements(matches[0]).filter(
        element =>
          /^h[1-6]$/.test(element.tag) && attribute(element, "id") === labelId
      );
      expect(headings).toHaveLength(1);
      expect(name(headings[0]).length).toBeGreaterThan(0);
    }
  );

  it("keeps the membership call to action linked to memorial creation", () => {
    const membership = content.find(
      element => attribute(element, "id") === "membership"
    )!;
    expect(
      elements(membership).some(
        element =>
          element.tag === "a" &&
          attribute(element, "href") === "/memorial/create" &&
          name(element) === "추모관 만들기"
      )
    ).toBe(true);
  });

  it("keeps in-page links named and pointing to existing sections", () => {
    const links = content.filter(
      element =>
        element.tag === "a" && attribute(element, "href")?.startsWith("#")
    );
    expect(
      links.some(element => attribute(element, "href") === "#memorials")
    ).toBe(true);
    for (const link of links) {
      expect(name(link).length).toBeGreaterThan(0);
      const targetId = attribute(link, "href")!.slice(1);
      expect(
        content.filter(element => attribute(element, "id") === targetId)
      ).toHaveLength(1);
    }
  });

  it("does not nest interactive elements inside another interactive element", () => {
    for (const interactive of content.filter(isInteractive)) {
      expect(elements(interactive).slice(1).filter(isInteractive)).toEqual([]);
      expect(name(interactive).length).toBeGreaterThan(0);
    }
  });
});
