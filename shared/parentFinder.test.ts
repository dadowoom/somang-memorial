import { describe, expect, it } from "vitest";
import {
  createIntermentMemorialCopy,
  formatMemorialDay,
  getIntermentPersonName,
  isSameIntermentPersonName,
  isSearchableIntermentBirthDate,
  normalizeIntermentName,
} from "./parentFinder";

describe("parent finder helpers", () => {
  it("normalizes spaces in a name for an exact lookup", () => {
    expect(normalizeIntermentName("김 소망 ")).toBe("김소망");
  });

  // normalizeIntermentName mirrors how the importer filled the stored
  // `nameNormalized` column, which kept the titles. If it ever starts
  // stripping them, every database comparison against that column breaks.
  it("keeps the title, because the stored column keeps it too", () => {
    expect(normalizeIntermentName("이한수 장로(타)")).toBe("이한수장로(타)");
    expect(normalizeIntermentName("권숙자 성도")).toBe("권숙자성도");
  });

  it.each([
    ["이한수 장로(타)", "이한수"],
    ["권숙자 성도", "권숙자"],
    ["윤영오 은퇴집사", "윤영오"],
    ["국현주 권사(은256)", "국현주"],
    ["김의학 사모(타)", "김의학"],
    ["박문자 전도사", "박문자"],
    ["이정숙 (타교)권사", "이정숙"],
    ["김문숙(김서은) 집사", "김문숙"],
    ["권마이클(윤준)", "권마이클"],
    ["최옥순 마리아(타)", "최옥순"],
    ["김창복 은퇴집사타)", "김창복"],
    ["조 훈", "조훈"],
  ])("extracts the person name from %s", (rawName, expected) => {
    expect(getIntermentPersonName(rawName)).toBe(expected);
  });

  // Stripping the title must never leave something too short to identify a
  // person, or to pass the two-character rule on the memorial creation form.
  it.each([
    ["김 권사", "김권사"],
    ["이 장로", "이장로"],
    ["최 성도", "최성도"],
  ])(
    "keeps %s whole rather than stripping it to one character",
    (raw, kept) => {
      expect(getIntermentPersonName(raw)).toBe(kept);
      expect(getIntermentPersonName(raw).length).toBeGreaterThanOrEqual(2);
    }
  );

  it("preserves legitimate names instead of truncating to three characters", () => {
    expect(getIntermentPersonName("신현 권사(타)")).toBe("신현");
    expect(getIntermentPersonName("권마이클(윤준)")).toBe("권마이클");
    expect(getIntermentPersonName("김성도")).toBe("김성도");
  });

  // The family sends back the cleaned name they were shown, so the safety
  // check has to match it against the raw record it came from.
  it("matches a cleaned name against the raw record it came from", () => {
    expect(isSameIntermentPersonName("이한수", "이한수 장로(타)")).toBe(true);
    expect(isSameIntermentPersonName("권숙자", "권숙자 성도")).toBe(true);
    expect(isSameIntermentPersonName("이한수", "이한순 장로(타)")).toBe(false);
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
