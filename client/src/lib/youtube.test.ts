import { describe, expect, it } from "vitest";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
} from "./youtube";

describe("YouTube kiosk URLs", () => {
  it("accepts a standard YouTube video id", () => {
    expect(isValidYouTubeVideoId("Ehp3DZxB9G4")).toBe(true);
  });

  it("rejects ids that could alter the generated URL", () => {
    expect(isValidYouTubeVideoId("bad/id?x=1")).toBe(false);
    expect(getYouTubeEmbedUrl("bad/id?x=1", true)).toBeNull();
    expect(getYouTubeThumbnailUrl("bad/id?x=1")).toBeNull();
  });

  it("uses the privacy-enhanced embed host and optional autoplay", () => {
    expect(getYouTubeEmbedUrl("Ehp3DZxB9G4", true)).toBe(
      "https://www.youtube-nocookie.com/embed/Ehp3DZxB9G4?rel=0&modestbranding=1&fs=0&playsinline=1&autoplay=1"
    );
    expect(getYouTubeEmbedUrl("Ehp3DZxB9G4")).toBe(
      "https://www.youtube-nocookie.com/embed/Ehp3DZxB9G4?rel=0&modestbranding=1&fs=0&playsinline=1"
    );
  });

  it("재생 상태를 알려 달라는 주소(enablejsapi·origin)를 만들 수 있다", () => {
    const url = getYouTubeEmbedUrl("Ehp3DZxB9G4", true, {
      jsApiOrigin: "https://somangmemorial.co.kr",
    });
    expect(url).toBe(
      "https://www.youtube-nocookie.com/embed/Ehp3DZxB9G4?rel=0&modestbranding=1&fs=0&playsinline=1&autoplay=1&enablejsapi=1&origin=https%3A%2F%2Fsomangmemorial.co.kr"
    );
  });

  it("generates the matching YouTube thumbnail URL", () => {
    expect(getYouTubeThumbnailUrl("Ehp3DZxB9G4")).toBe(
      "https://i.ytimg.com/vi/Ehp3DZxB9G4/hqdefault.jpg"
    );
  });
});
