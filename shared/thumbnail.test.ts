import { describe, expect, it } from "vitest";
import { hasThumbnailSlot, thumbnailPathFor } from "./thumbnail";
import { withThumbnails } from "../server/_core/uploadCleanup";

describe("작은 사진 이름 규칙", () => {
  it("원본 옆에 .thumb.jpg 로 둔다", () => {
    expect(thumbnailPathFor("gallery/12/abc_1234.jpg")).toBe(
      "gallery/12/abc_1234.thumb.jpg"
    );
    expect(thumbnailPathFor("/uploads/family-rooms/3/x_9.png")).toBe(
      "/uploads/family-rooms/3/x_9.thumb.jpg"
    );
    // 두 번 붙이지 않는다
    expect(thumbnailPathFor("gallery/1/a.thumb.jpg")).toBe(
      "gallery/1/a.thumb.jpg"
    );
  });

  it("우리 서버에 올린 사진만 작은 사진 자리가 있다", () => {
    expect(hasThumbnailSlot("/uploads/gallery/1/a.jpg")).toBe(true);
    expect(
      hasThumbnailSlot("https://d2xsxph8kpxj0f.cloudfront.net/a.jpg")
    ).toBe(false);
    expect(hasThumbnailSlot("/somang-hill-1.jpg")).toBe(false);
    expect(hasThumbnailSlot(null)).toBe(false);
  });

  it("새벽 정리는 쓰이는 원본의 작은 사진을 치우지 않는다", () => {
    const keys = withThumbnails(new Set(["gallery/1/a.jpg"]));
    expect(keys.has("gallery/1/a.jpg")).toBe(true);
    expect(keys.has("gallery/1/a.thumb.jpg")).toBe(true);
  });
});
