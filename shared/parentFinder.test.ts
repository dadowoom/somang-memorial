import { describe, expect, it } from "vitest";
import {
  createIntermentMemorialCopy,
  formatMemorialDay,
  getIntermentPersonName,
  isSearchableIntermentBirthDate,
  isSameIntermentPersonName,
  normalizeIntermentName,
} from "./parentFinder";

describe("parent finder helpers", () => {
  it("normalizes spaces in a name for an exact lookup", () => {
    expect(normalizeIntermentName("김 소망 ")).toBe("김소망");
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

  it("preserves legitimate names instead of truncating to three characters", () => {
    expect(getIntermentPersonName("신현 권사(타)")).toBe("신현");
    expect(getIntermentPersonName("권마이클(윤준)")).toBe("권마이클");
    expect(getIntermentPersonName("김성도")).toBe("김성도");
  });

  it("matches a clean search name against a legacy role-suffixed name", () => {
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
