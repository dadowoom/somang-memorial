import { describe, expect, it } from "vitest";
import { getLoginMode } from "./loginMode";
describe("first visit and returning member entry", () => {
  it.each([
    "",
    "?redirect=/memorial/create",
    "?mode=login&redirect=/memorial/create",
    "?mode=unknown",
  ])("defaults to login: %s", search => {
    expect(getLoginMode(search)).toBe("login");
  });
  it("opens sign-up only when requested explicitly", () => {
    expect(getLoginMode("?mode=signup&redirect=/memorial/create")).toBe(
      "signup"
    );
  });
});
