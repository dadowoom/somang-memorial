import { describe, expect, it } from "vitest";
import {
  cleanIntermentFields,
  describeIntermentChanges,
  normalizeIntermentDate,
} from "./intermentAdmin";

const base = {
  name: "김소망 권사(타)",
  role: "권사",
  affiliation: "",
  pastor: "",
  funeralChurch: "",
  birthDate: "1933-01-05",
  deathDate: "2020-05-22",
  deathAge: "",
  burialPlace: "소망동산",
  burialDate: "",
};

describe("안장 기록 날짜 다듬기", () => {
  it("DB 에 있는 세 가지 모양으로 맞춘다", () => {
    expect(normalizeIntermentDate("")).toBe("0000-00-00");
    expect(normalizeIntermentDate("0000-00-00")).toBe("0000-00-00");
    expect(normalizeIntermentDate("1933")).toBe("1933-00-00");
    expect(normalizeIntermentDate("1933-01-05")).toBe("1933-01-05");
    expect(normalizeIntermentDate("1933.1.5")).toBe("1933-01-05");
    expect(normalizeIntermentDate("1933. 1. 5.")).toBe("1933-01-05");
    expect(normalizeIntermentDate("19330105")).toBe("1933-01-05");
    expect(normalizeIntermentDate("1933-3")).toBe("1933-03-00");
  });

  it("없는 날짜와 이상한 글자는 받지 않는다", () => {
    expect(normalizeIntermentDate("1933-02-30")).toBeNull();
    expect(normalizeIntermentDate("1933-13-01")).toBeNull();
    expect(normalizeIntermentDate("33-01-05")).toBeNull();
    expect(normalizeIntermentDate("1700-01-01")).toBeNull();
    expect(normalizeIntermentDate("모름")).toBeNull();
  });
});

describe("입력 다듬기", () => {
  it("빈 칸은 없음(null)으로, 모르는 날짜는 0000-00-00 으로", () => {
    const { value } = cleanIntermentFields({
      ...base,
      birthDate: "",
      role: "  ",
    });
    expect(value).toMatchObject({
      name: "김소망 권사(타)",
      role: null,
      birthDate: "0000-00-00",
      burialDate: null,
    });
  });

  it("틀린 칸마다 까닭을 알려 준다", () => {
    const { value, errors } = cleanIntermentFields({
      ...base,
      name: "김",
      birthDate: "1933-02-30",
      burialDate: "어제",
    });
    expect(value).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(
      ["birthDate", "burialDate", "name"].sort()
    );
  });

  it("소천일이 생년보다 앞서면 받지 않는다", () => {
    const { errors } = cleanIntermentFields({
      ...base,
      birthDate: "1990",
      deathDate: "1980-01-01",
    });
    expect(errors.deathDate).toBeDefined();
  });

  it("바뀐 칸만 관리 기록에 적는다", () => {
    const before = cleanIntermentFields(base).value!;
    const after = cleanIntermentFields({
      ...base,
      name: "김소망",
      burialDate: "2020-05-25",
    }).value!;
    expect(describeIntermentChanges(before, after)).toEqual([
      "성함: 김소망 권사(타) → 김소망",
      "안장일: (없음) → 2020-05-25",
    ]);
    expect(describeIntermentChanges(before, before)).toEqual([]);
  });
});
