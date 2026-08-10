import { describe, expect, it } from "vitest";
import { getSessionAppId } from "./sdk";

describe("local session application identifier", () => {
  it("uses a stable internal value when OAuth is not configured", () => {
    expect(getSessionAppId("")).toBe("somang-memorial");
  });

  it("keeps the configured OAuth application identifier", () => {
    expect(getSessionAppId("configured-app")).toBe("configured-app");
  });
});
