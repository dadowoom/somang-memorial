import { describe, expect, it } from "vitest";
import { maskEmailForAudit, maskPhoneForAudit } from "./auditNotes";

describe("maskPhoneForAudit", () => {
  it("가운데 네 자리를 가린다", () => {
    expect(maskPhoneForAudit("010-1234-5678")).toBe("010-****-5678");
    expect(maskPhoneForAudit("01012345678")).toBe("010-****-5678");
  });

  it("너무 짧으면 전부 가린다", () => {
    expect(maskPhoneForAudit("1234")).toBe("***");
  });
});

describe("maskEmailForAudit", () => {
  it("앞 두 글자와 도메인만 남긴다", () => {
    expect(maskEmailForAudit("somang@example.org")).toBe("so***@example.org");
    expect(maskEmailForAudit("a@example.org")).toBe("a***@example.org");
  });

  it("없거나 이상한 값은 알아볼 수 없게 한다", () => {
    expect(maskEmailForAudit(null)).toBe("(이메일 없음)");
    expect(maskEmailForAudit("no-at-sign")).toBe("***");
  });
});
