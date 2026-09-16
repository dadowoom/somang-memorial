import { describe, expect, it } from "vitest";
import {
  BOOK_READER_CHROME_PX,
  BOOK_READER_HEADER_PX,
  BOOK_READER_TOP_TARGET_VH,
  bookReaderFrameWidth,
  bookReaderTopOffset,
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

describe("bookReaderTopOffset", () => {
  it("세로로 긴 화면에서는 책을 이름 검색칸 높이(화면 25%)까지만 내린다", () => {
    const offset = bookReaderTopOffset(false);
    expect(BOOK_READER_TOP_TARGET_VH).toBe(25);
    expect(offset).toContain(
      `calc(${BOOK_READER_TOP_TARGET_VH}dvh - ${BOOK_READER_HEADER_PX}px)`
    );
    expect(offset.startsWith("max(0px, min(")).toBe(true);
  });

  it("남는 공간이 적으면 가운데 자리보다 더 내리지 않는다", () => {
    expect(bookReaderTopOffset(false)).toContain(
      `calc((100dvh - ${BOOK_READER_CHROME_PX}px - min(calc(92vw / 1.5556)`
    );
    expect(bookReaderTopOffset(true)).toContain("calc(94vw / 0.6800)");
  });
});
