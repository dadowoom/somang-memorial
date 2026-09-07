import { describe, expect, it } from "vitest";
import {
  serializeMemorialDraft,
  withoutDraftCredentials,
  draftKeyForUser,
  readMemorialDraft,
  serializeOwnedDraft,
  writingFingerprint,
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

describe("account-scoped draft restoration", () => {
  const form = {
    name: "작성 예시",
    visibility: "private",
    accessPassword: "test-only",
  };
  const timeline = [
    { id: "one", year: "1980", title: "예배", description: "가족과 함께" },
  ];
  const raw = serializeOwnedDraft(7, form, timeline, 3, 1750000000000);

  it("keeps the writer, saved time, and step without persisting credentials", () => {
    expect(readMemorialDraft(raw, 7)).toMatchObject({
      form: { name: "작성 예시", visibility: "private" },
      step: 3,
      savedAt: 1750000000000,
      timeline: [{ year: "1980", title: "예배", description: "가족과 함께" }],
    });
    expect(raw).not.toContain("accessPassword");
    expect(raw).not.toContain("test-only");
  });
  it("never restores a different account's saved draft", () => {
    expect(draftKeyForUser(7)).not.toBe(draftKeyForUser(8));
    expect(readMemorialDraft(raw, 8)).toBeNull();
    expect(readMemorialDraft(raw, 8, true)).toBeNull();
  });
  it("requires an explicit legacy import and still excludes old credentials", () => {
    const old = JSON.stringify({ form, timeline });
    expect(readMemorialDraft(old, 7)).toBeNull();
    expect(readMemorialDraft(old, 7, true)?.form).toEqual({
      name: "작성 예시",
      visibility: "private",
    });
  });
  it.each([
    "null",
    "{",
    "[]",
    JSON.stringify({ version: 2, userId: 7, form: [], timeline: [] }),
  ])("rejects malformed stored data: %s", input => {
    expect(readMemorialDraft(input, 7)).toBeNull();
  });
  it("rejects invalid field types or oversized writing without truncating it", () => {
    for (const invalid of [
      { name: 123 },
      { story: "a".repeat(10001) },
      { visibility: "unknown" },
    ]) {
      expect(
        readMemorialDraft(serializeOwnedDraft(7, invalid, [], 0, 1), 7)
      ).toBeNull();
    }
  });
  it("rejects too many timeline entries", () => {
    expect(
      readMemorialDraft(
        serializeOwnedDraft(7, form, Array(31).fill(timeline[0]), 0, 1),
        7
      )
    ).toBeNull();
  });
  it("ignores blank rows and local row IDs when detecting unsaved changes", () => {
    expect(writingFingerprint(form, [])).toBe(
      writingFingerprint(form, [
        { id: "empty", year: "", title: "", description: "" },
      ])
    );
    expect(writingFingerprint(form, timeline)).toBe(
      writingFingerprint(form, [{ ...timeline[0], id: "restored" }])
    );
    expect(writingFingerprint(form, timeline)).not.toBe(
      writingFingerprint({ ...form, name: "다른 기록" }, timeline)
    );
  });
});
