import { describe, expect, it } from "vitest";
import {
  canUserReadMemorial,
  createMemorialAccessToken,
  escapeMemorialSearchKeyword,
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
