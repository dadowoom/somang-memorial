import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 입력칸 폭 감시 (2026-09-17).
 *
 * 아이폰(사파리 엔진)은 폭이 정해지지 않은 입력칸의 기본 너비를 한글 글꼴 기준으로
 * 넓게 잡는다. 홈페이지 "문의하기" 창에서 입력칸이 창보다 넓어져 창 전체가 좌우로
 * 흔들렸다(아이폰 13 mini). PC·안드로이드 크롬에서는 드러나지 않아 화면으로는 놓치기
 * 쉬우므로, 화면 코드의 입력칸·긴 글 칸·고르는 칸이 모두 폭을 갖는지 코드로 살핀다.
 */

const SRC = fileURLToPath(new URL("..", import.meta.url));

// 폭을 정하는 Tailwind 표시.
const WIDTH_HINT =
  /(^|[\s"'`{])(w-full|w-\[[^\]]+\]|w-\d+|flex-1|min-w-0|max-w-full|grow|flex-auto)(?=$|[\s"'`}])/;

// 폭이 필요 없는 종류.
const SKIP_TYPE = /type="(hidden|checkbox|radio|file|range|color)"/;

// 공용 모양 변수. formStyles.ts 에서 가져오거나, 파일 안에서 같은 이름으로 정의한다.
const CLASS_VARS = ["inputClass", "selectClass", "textAreaClass"];

// className 없이 CSS 로 폭을 주는 화면과 그 CSS 규칙.
const CSS_SIZED_FILES: Record<string, { css: string; rule: RegExp }> = {
  "components/inquiry/InquiryDialog.tsx": {
    css: "components/inquiry/inquiryDialog.css",
    rule: /\.inquiry-dialog-field input \{[^}]*width: 100%;[^}]*min-width: 0;/,
  },
  "components/kiosk/KioskInquiryOverlay.tsx": {
    css: "components/kiosk/kioskInquiry.css",
    rule: /\.kiosk-inquiry-field input \{[^}]*width: 100%;[^}]*min-width: 0;/,
  },
};

// 클래스 이름으로 CSS 에서 폭을 주는 곳과 그 CSS 규칙.
const CSS_SIZED_CLASSES: Record<string, { css: string; rule: RegExp }> = {
  "kiosk-family-gate__input": {
    css: "pages/kioskMemorialTabs.css",
    rule: /\.kiosk-family-gate__input \{[^}]*width: min\(100%/,
  },
};

function readSrc(path: string) {
  return readFileSync(join(SRC, path), "utf8");
}

function listTsx(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    const rel = relative(SRC, full);
    // shadcn 기본 부품(components/ui)은 라이브러리 모양을 그대로 쓴다.
    if (rel === join("components", "ui")) return [];
    if (statSync(full).isDirectory()) return listTsx(full);
    return name.endsWith(".tsx") ? [full] : [];
  });
}

/** JSX 태그를 끝(중괄호 밖의 '>')까지 읽는다. */
function readTag(src: string, start: number) {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (ch === ">" && depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

function classVarHasWidth(src: string, name: string, sharedHasWidth: boolean) {
  const local = src.match(
    new RegExp(`const ${name} =\\s*(\`[^\`]*\`|"[^"]*")`)
  );
  if (local) return local[1].includes("w-full");
  const imported = new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"@/lib/formStyles"`
  ).test(src);
  return imported && sharedHasWidth;
}

describe("입력칸 폭 (아이폰에서 창보다 넓어지지 않게)", () => {
  const formStyles = readSrc("lib/formStyles.ts");
  const sharedHasWidth = /const boxBase =\s*"[^"]*\bw-full\b/.test(formStyles);

  it("공용 입력칸 모양(formStyles.ts)은 폭 100%를 갖는다", () => {
    expect(sharedHasWidth).toBe(true);
  });

  it("문의 창은 칸 너비가 0 까지 줄 수 있고 좌우로 밀리지 않는다", () => {
    const css = readSrc("components/inquiry/inquiryDialog.css");
    expect(css).toMatch(
      /\.inquiry-dialog-form \{[^}]*grid-template-columns: minmax\(0, 1fr\);/
    );
    expect(css).toMatch(
      /\.inquiry-dialog-field \{[^}]*grid-template-columns: minmax\(0, 1fr\);/
    );
    expect(css).toMatch(/\.inquiry-dialog \{[^}]*overflow-x: hidden;/);
  });

  it("화면 코드의 모든 입력칸·긴 글 칸·고르는 칸이 폭을 갖는다", () => {
    const unsized: string[] = [];

    for (const file of listTsx(SRC)) {
      const rel = relative(SRC, file).split("\\").join("/");
      if (rel.endsWith(".test.tsx")) continue;
      const src = readFileSync(file, "utf8");

      for (const match of src.matchAll(/<(input|textarea|select)\b/g)) {
        const tag = readTag(src, match.index ?? 0);
        if (SKIP_TYPE.test(tag)) continue;
        if (WIDTH_HINT.test(tag)) continue;

        const vars = CLASS_VARS.filter(name =>
          new RegExp(`\\b${name}\\b`).test(tag)
        );
        if (
          vars.length > 0 &&
          vars.every(name => classVarHasWidth(src, name, sharedHasWidth))
        ) {
          continue;
        }

        const line = src.slice(0, match.index).split("\n").length;
        const where = `${rel}:${line} <${match[1]}>`;

        const sizedClass = Object.entries(CSS_SIZED_CLASSES).find(([name]) =>
          tag.includes(name)
        );
        if (sizedClass) {
          const [, { css, rule }] = sizedClass;
          if (!rule.test(readSrc(css))) unsized.push(`${where} (${css} 폭 규칙 없음)`);
          continue;
        }

        const sizedFile = CSS_SIZED_FILES[rel];
        if (sizedFile && !tag.includes("className=")) {
          if (!sizedFile.rule.test(readSrc(sizedFile.css))) {
            unsized.push(`${where} (${sizedFile.css} 폭 규칙 없음)`);
          }
          continue;
        }

        unsized.push(where);
      }
    }

    expect(unsized).toEqual([]);
  });
});
