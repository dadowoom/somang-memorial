import { describe, expect, it } from "vitest";
import {
  BURIAL_PLACE,
  SOURCE_ID_BASE,
  SOURCE_KEY,
  planImport,
  prepareRecords,
} from "./importInterment1995_2006.mjs";

const source = (changes = {}) => ({
  sourceKey: SOURCE_KEY,
  sourceSha256: "a".repeat(64),
  records: [
    {
      sourceRow: 2,
      name: "가상인물",
      birthDate: "1930-01-01",
      deathDate: "2000-01-01",
      note: "유가족 홍길동",
      ...changes,
    },
  ],
});

describe("1995~2006 안장 명단 등록", () => {
  it("유가족 성함(비고)은 담지 않고, 안장지는 소망동산으로 둔다", () => {
    const [r] = prepareRecords(source());
    expect(r.burialPlace).toBe(BURIAL_PLACE);
    expect(r.sourceId).toBe(SOURCE_ID_BASE - 2);
    expect(r.sourcePayload).not.toContain("홍길동");
    expect(r.sourcePayload).not.toContain("note");
  });

  it("생년월일이 이상하거나 소천일보다 뒤면 비워 둔다", () => {
    expect(prepareRecords(source({ birthDate: "1953-" }))[0].birthDate).toBe("");
    expect(prepareRecords(source({ birthDate: "" }))[0].birthDate).toBe("");
    expect(
      prepareRecords(source({ birthDate: "2005-01-01" }))[0].birthDate
    ).toBe("");
  });

  it("1995~2006 밖의 소천일은 받지 않는다", () => {
    expect(() => prepareRecords(source({ deathDate: "2023-12-08" }))).toThrow();
    expect(() => prepareRecords(source({ deathDate: "1994-12-31" }))).toThrow();
  });

  it("이름이 같은 분이 이미 있으면 한 명도 넣지 않고 멈춘다", () => {
    const records = prepareRecords(source());
    expect(() =>
      planImport(records, [
        {
          sourceId: 1,
          nameNormalized: "가상인물",
          birthDate: "1900-01-01",
          deathDate: "1980-01-01",
        },
      ])
    ).toThrow();
  });

  it("같은 줄을 다시 돌리면 건너뛴다", () => {
    const records = prepareRecords(source());
    const plan = planImport(records, [
      { sourceId: records[0].sourceId, sourcePayload: records[0].sourcePayload },
    ]);
    expect(plan.insert).toHaveLength(0);
    expect(plan.skipped).toEqual([records[0].sourceId]);
  });

  it("아무도 없으면 그대로 넣는다", () => {
    const plan = planImport(prepareRecords(source()), []);
    expect(plan.insert).toHaveLength(1);
  });
});
