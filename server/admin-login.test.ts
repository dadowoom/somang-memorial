import { describe, expect, it } from "vitest";
import {
  ADMIN_ACCOUNT_EMAIL,
  isAdminLoginIdentifier,
  resolveLocalLoginEmail,
} from "./db";

describe("administrator login identifier", () => {
  it("resolves the reserved admin ID to its internal account", () => {
    expect(isAdminLoginIdentifier(" ADMIN ")).toBe(true);
    expect(resolveLocalLoginEmail("admin")).toBe(ADMIN_ACCOUNT_EMAIL);
  });

  it("keeps normal member email logins unchanged", () => {
    expect(isAdminLoginIdentifier("member@example.com")).toBe(false);
    expect(resolveLocalLoginEmail(" Member@Example.com ")).toBe(
      "member@example.com"
    );
  });
});
