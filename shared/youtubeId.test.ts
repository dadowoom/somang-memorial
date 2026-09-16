import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId } from "./youtubeId";

describe("extractYoutubeVideoId", () => {
  it("여러 형태의 유튜브 주소에서 영상 번호를 꺼낸다", () => {
    const id = "dQw4w9WgXcQ";
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/live/${id}`,
      `  ${id}  `,
    ]) {
      expect(extractYoutubeVideoId(url)).toBe(id);
    }
  });

  it("빈칸이나 알아볼 수 없는 값은 null", () => {
    expect(extractYoutubeVideoId("")).toBeNull();
    expect(extractYoutubeVideoId("   ")).toBeNull();
    expect(extractYoutubeVideoId("https://example.com/video")).toBeNull();
    expect(extractYoutubeVideoId("abc")).toBeNull();
  });
});
