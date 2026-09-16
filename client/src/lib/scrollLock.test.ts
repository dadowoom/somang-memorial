import { describe, expect, it } from "vitest";
import { lockPageScroll } from "./scrollLock";

function fakeDocument() {
  return {
    documentElement: { style: { overflow: "" } },
    body: { style: { overflow: "auto" } },
  } as unknown as Document;
}

describe("lockPageScroll", () => {
  it("html 과 body 를 함께 잠그고, 풀면 원래대로 돌린다", () => {
    const doc = fakeDocument();
    const release = lockPageScroll(doc);
    expect(doc.documentElement.style.overflow).toBe("hidden");
    expect(doc.body.style.overflow).toBe("hidden");
    release();
    expect(doc.documentElement.style.overflow).toBe("");
    expect(doc.body.style.overflow).toBe("auto");
  });

  it("창이 겹쳐 떠 있으면 마지막 창이 닫힐 때 푼다", () => {
    const doc = fakeDocument();
    const releasePhoto = lockPageScroll(doc);
    const releaseKeyboard = lockPageScroll(doc);
    releasePhoto();
    expect(doc.body.style.overflow).toBe("hidden");
    releaseKeyboard();
    expect(doc.body.style.overflow).toBe("auto");
  });

  it("같은 잠금을 두 번 풀어도 다른 창의 잠금을 풀지 않는다", () => {
    const doc = fakeDocument();
    const first = lockPageScroll(doc);
    const second = lockPageScroll(doc);
    first();
    first();
    expect(doc.body.style.overflow).toBe("hidden");
    second();
    expect(doc.body.style.overflow).toBe("auto");
  });
});
