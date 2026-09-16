import { describe, expect, it } from "vitest";
import {
  BOOK_READER_CHROME_PX,
  bookReaderFrameWidth,
} from "./bookReaderLayout";

describe("bookReaderFrameWidth", () => {
  it("PC 는 두 쪽 펼침 비율로, 화면 가로 92% 를 넘지 않는다", () => {
    const width = bookReaderFrameWidth(false);
    expect(width).toContain("min(92vw");
    expect(width).toContain(`100dvh - ${BOOK_READER_CHROME_PX}px`);
    // 560/720 × 2 = 1.5556
    expect(width).toContain("1.5556");
  });

  it("휴대폰은 한 쪽 세로 비율로, 화면 가로 94% 를 넘지 않는다", () => {
    const width = bookReaderFrameWidth(true);
    expect(width).toContain("min(94vw");
    // 340/500 = 0.68
    expect(width).toContain("0.6800");
  });
});
