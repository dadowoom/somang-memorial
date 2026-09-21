import { describe, expect, it } from "vitest";
import { checkPair } from "./mergeSplitIntermentRecords.mjs";

const keep = { id: 1, name: "고금화", birthDate: "0000-00-00", deathDate: "2009-11-26", memorialId: null };
const remove = { id: 2, name: "고금화", birthDate: "1919-09-05", deathDate: "0000-00-00", memorialId: null };
const plan = { keepId: 1, removeId: 2, birthDate: "1919-09-05" };

describe("나뉜 안장 기록 합치기 확인", () => {
  it("생년월일만 있는 줄과 소천일만 있는 줄은 합친다", () => {
    expect(checkPair(plan, keep, remove)).toBeNull();
    expect(checkPair(plan, { ...keep, name: "고금화 권사(타)" }, remove)).toBeNull();
  });
  it("이름이 다르거나 날짜가 이미 채워져 있으면 멈춘다", () => {
    expect(checkPair(plan, { ...keep, name: "고금순" }, remove)).not.toBeNull();
    expect(checkPair(plan, { ...keep, birthDate: "1919-09-05" }, remove)).not.toBeNull();
    expect(checkPair(plan, keep, { ...remove, deathDate: "2009-11-26" })).not.toBeNull();
    expect(checkPair({ ...plan, birthDate: "1920-01-01" }, keep, remove)).not.toBeNull();
  });
  it("추모관이 연결된 기록은 건드리지 않는다", () => {
    expect(checkPair(plan, { ...keep, memorialId: 9 }, remove)).not.toBeNull();
    expect(checkPair(plan, keep, { ...remove, memorialId: 9 })).not.toBeNull();
  });
});
