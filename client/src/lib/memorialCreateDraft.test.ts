import { describe, expect, it } from "vitest";
import {
  serializeMemorialDraft,
  withoutDraftCredentials,
} from "./memorialCreateDraft";

describe("memorial writing drafts", () => {
  it("saves the writing and timeline without entrance credentials", () => {
    const timeline = [
      { year: "1980", title: "교회 등록", description: "가족과 함께" },
    ];
    const saved = JSON.parse(
      serializeMemorialDraft(
        {
          name: "작성 예시",
          story: "가족의 기억",
          visibility: "private",
          accessPassword: "test-only-credential",
        },
        timeline
      )
    );
    expect(saved).toEqual({
      form: { name: "작성 예시", story: "가족의 기억", visibility: "private" },
      timeline,
    });
  });

  it("does not restore credentials or admin-only fields from an older draft", () => {
    const writing = withoutDraftCredentials({
      name: "작성 예시",
      story: "기존 기록",
      accessPassword: "old-test-value",
      managerMemo: "legacy field",
    });
    expect(writing).toEqual({ name: "작성 예시", story: "기존 기록" });
  });

  it("preserves optional writing without modifying the original form", () => {
    const form = {
      name: "작성 예시",
      deathDate: "",
      accessPassword: "test-only",
    };
    expect(withoutDraftCredentials(form)).toEqual({
      name: "작성 예시",
      deathDate: "",
    });
    expect(form.accessPassword).toBe("test-only");
  });
});
