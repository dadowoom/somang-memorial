import { describe, expect, it } from "vitest";
import {
  LIGHTBOX_SWIPE_MIN_PX,
  lightboxSwipeDirection,
} from "./MemorialGallerySection";

describe("앨범 크게 보기 밀어서 넘기기", () => {
  it("왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전 사진", () => {
    expect(lightboxSwipeDirection(-80, 5)).toBe(1);
    expect(lightboxSwipeDirection(80, -5)).toBe(-1);
  });

  it("조금 밀거나 위아래로 민 것은 넘기지 않는다", () => {
    expect(lightboxSwipeDirection(-(LIGHTBOX_SWIPE_MIN_PX - 1), 0)).toBe(0);
    expect(lightboxSwipeDirection(-60, 120)).toBe(0);
  });
});
