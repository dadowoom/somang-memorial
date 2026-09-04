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

describe("관리자 확인을 기다리는 추모관", () => {
  // 부모찾기로 만든 추모관은 pending 으로 시작한다. 유가족이 정한 비밀번호를
  // 가족에게 알려줬는데 아무도 못 들어가면 서비스가 성립하지 않는다.
  const pendingMemorial = {
    slug: "pending-memorial",
    visibility: "private",
    status: "pending",
    accessPasswordHash: hashMemorialAccessPassword("family2026"),
    createdByUserId: 7,
  };

  it("맞는 비밀번호로 들어올 수 있다", () => {
    const token = createMemorialAccessToken(
      pendingMemorial.slug,
      pendingMemorial.accessPasswordHash
    );
    expect(canUserReadMemorial(pendingMemorial, token, null)).toBe(true);
  });

  it("비밀번호 없이는 못 들어온다", () => {
    expect(canUserReadMemorial(pendingMemorial, null, null)).toBe(false);
  });

  it("다른 추모관의 열쇠로는 못 들어온다", () => {
    const other = createMemorialAccessToken(
      "another-memorial",
      pendingMemorial.accessPasswordHash
    );
    expect(canUserReadMemorial(pendingMemorial, other, null)).toBe(false);
  });

  it("만든 사람은 비밀번호 없이도 볼 수 있다", () => {
    expect(
      canUserReadMemorial(pendingMemorial, null, { id: 7, role: "user" })
    ).toBe(true);
  });
});

describe("관리자가 내린 추모관", () => {
  // private 은 관리자가 문제를 발견해 내린 상태다. 비밀번호를 아는 사람이라도
  // 들어오지 못해야 관리자의 조치가 의미를 가진다.
  const takenDown = {
    slug: "taken-down",
    visibility: "private",
    status: "private",
    accessPasswordHash: hashMemorialAccessPassword("family2026"),
    createdByUserId: 7,
  };

  it("맞는 비밀번호라도 들어올 수 없다", () => {
    const token = createMemorialAccessToken(
      takenDown.slug,
      takenDown.accessPasswordHash
    );
    expect(canUserReadMemorial(takenDown, token, null)).toBe(false);
  });

  it("관리자와 만든 사람은 여전히 볼 수 있다", () => {
    expect(canUserReadMemorial(takenDown, null, { id: 1, role: "admin" })).toBe(
      true
    );
    expect(canUserReadMemorial(takenDown, null, { id: 7, role: "user" })).toBe(
      true
    );
  });
});
