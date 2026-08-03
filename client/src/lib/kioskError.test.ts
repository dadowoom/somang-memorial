import { describe, expect, it } from "vitest";
import { getKioskErrorCode, getKioskPasswordErrorMessage } from "./kioskError";

describe("kiosk error messages", () => {
  it("reads a tRPC error code", () => {
    expect(getKioskErrorCode({ data: { code: "NOT_FOUND" } })).toBe(
      "NOT_FOUND"
    );
  });

  it("does not guess a code from an unrelated error", () => {
    expect(getKioskErrorCode(new Error("network failed"))).toBeNull();
    expect(getKioskErrorCode(null)).toBeNull();
  });

  it("distinguishes a wrong password from connection errors", () => {
    expect(
      getKioskPasswordErrorMessage({ data: { code: "UNAUTHORIZED" } })
    ).toBe("비밀번호가 맞지 않습니다.");
    expect(getKioskPasswordErrorMessage(new Error("network failed"))).toBe(
      "연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요."
    );
  });

  it("reports a missing memorial separately", () => {
    expect(getKioskPasswordErrorMessage({ data: { code: "NOT_FOUND" } })).toBe(
      "추모관을 찾을 수 없습니다."
    );
  });
});
