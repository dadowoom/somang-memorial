import { describe, expect, it } from "vitest";
import {
  createIntermentMemorialCopy,
  formatMemorialDay,
  isSearchableIntermentBirthDate,
  normalizeIntermentName,
} from "./parentFinder";

describe("parent finder helpers", () => {
  it("normalizes spaces in a name for an exact lookup", () => {
    expect(normalizeIntermentName("김 소망 ")).toBe("김소망");
  });

  it("accepts only a complete birth date for the first search flow", () => {
    expect(isSearchableIntermentBirthDate("1933-05-22")).toBe(true);
    expect(isSearchableIntermentBirthDate("1933-00-00")).toBe(false);
    expect(isSearchableIntermentBirthDate("0000-00-00")).toBe(false);
    expect(isSearchableIntermentBirthDate("1933-02-30")).toBe(false);
  });

  it("creates an editable memorial copy without changing the source record", () => {
    expect(
      createIntermentMemorialCopy({
        name: "김소망",
        role: "권사",
        deathDate: "2026-05-22",
      })
    ).toEqual({
      role: "권사",
      summary: "소망동산에 안장되신 김소망님의 삶을 기억합니다.",
      story:
        "김소망님을 가족과 소망교회 공동체가 함께 기억합니다. 추모관을 완성하며 남기고 싶은 삶과 신앙의 이야기를 기록해 주세요.",
      memorialDay: "매년 05월 22일",
    });
  });

  it("does not create a memorial day from an incomplete death date", () => {
    expect(formatMemorialDay("2026")).toBeNull();
  });
});
