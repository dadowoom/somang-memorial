import { describe, expect, it } from "vitest";
import {
  canUserReadMemorial,
  createMemorialAccessToken,
  hashMemorialAccessPassword,
} from "./db";

const accessPasswordHash = hashMemorialAccessPassword("1234");
const privateMemorial = {
  slug: "park-somang",
  visibility: "private",
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
});
