import { describe, expect, it } from "vitest";
import { memorialRequiredFields } from "./memorialFormCopy";

describe("memorial required-field copy", () => {
  it("preserves the required fields and their order for create and edit", () => {
    expect(memorialRequiredFields.map(field => field.key)).toEqual([
      "name",
      "role",
      "birthDate",
      "summary",
      "story",
    ]);
  });

  it.each([
    ["name", "성함을 입력해 주세요."],
    ["role", "직분을 입력해 주세요."],
    ["birthDate", "출생일을 입력해 주세요."],
    ["summary", "한 줄 소개를 입력해 주세요."],
    ["story", "삶의 기록을 입력해 주세요."],
  ])("uses the correct object particle for %s", (key, message) => {
    expect(memorialRequiredFields.find(field => field.key === key)?.message).toBe(
      message
    );
  });
});
