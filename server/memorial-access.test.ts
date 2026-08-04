import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canUserReadMemorial,
  createMemorialAccessToken,
  escapeMemorialSearchKeyword,
  getMemorialFamilyRoomVideo,
  hashMemorialAccessPassword,
} from "./db";

const accessPasswordHash = hashMemorialAccessPassword("1234");
const privateMemorial = {
  slug: "park-somang",
  visibility: "private",
  status: "published",
  accessPasswordHash,
  createdByUserId: 7,
};

describe("canUserReadMemorial", () => {
  it("blocks private memorial data without a token or owner session", () => {
    expect(canUserReadMemorial(privateMemorial)).toBe(false);
  });

  it("allows private memorial data with a valid access token", () => {
    const token = createMemorialAccessToken("park-somang", accessPasswordHash);
    expect(canUserReadMemorial(privateMemorial, token)).toBe(true);
  });

  it("allows the memorial owner and admins without a password token", () => {
    expect(
      canUserReadMemorial(privateMemorial, null, { id: 7, role: "user" })
    ).toBe(true);
    expect(
      canUserReadMemorial(privateMemorial, null, { id: 99, role: "admin" })
    ).toBe(true);
  });

  it("blocks unpublished memorials except for their owner or an admin", () => {
    const pendingMemorial = {
      ...privateMemorial,
      visibility: "public",
      status: "pending",
    };

    expect(canUserReadMemorial(pendingMemorial)).toBe(false);
    expect(
      canUserReadMemorial(pendingMemorial, null, { id: 7, role: "user" })
    ).toBe(true);
    expect(
      canUserReadMemorial(pendingMemorial, null, { id: 99, role: "admin" })
    ).toBe(true);
  });
});

describe("escapeMemorialSearchKeyword", () => {
  it("treats SQL LIKE wildcards as ordinary search characters", () => {
    expect(escapeMemorialSearchKeyword("100%_safe\\name")).toBe(
      "100\\%\\_safe\\\\name"
    );
  });
});

describe("getMemorialFamilyRoomVideo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the private family video configured for Kim Somang", () => {
    vi.stubEnv("KIM_SOMANG_FAMILY_VIDEO_ID", "Abcdef12_-3");

    expect(getMemorialFamilyRoomVideo("kim-somang-kwonsa")).toEqual({
      title: "가족에게 남기는 말씀",
      description:
        "유순아 집사님의 위로 메시지와 ‘야곱의 축복’을 영상으로 전합니다.",
      youtubeVideoId: "Abcdef12_-3",
    });
  });

  it("does not expose a family video for other memorials", () => {
    vi.stubEnv("KIM_SOMANG_FAMILY_VIDEO_ID", "Abcdef12_-3");
    expect(getMemorialFamilyRoomVideo("kim-youngsu-elder")).toBeNull();
  });

  it("does not expose a family video when the private setting is missing", () => {
    vi.stubEnv("KIM_SOMANG_FAMILY_VIDEO_ID", "");
    expect(getMemorialFamilyRoomVideo("kim-somang-kwonsa")).toBeNull();
  });
});
