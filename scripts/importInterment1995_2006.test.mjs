import { describe, expect, it } from "vitest";
import {
  BURIAL_PLACE,
  SOURCE_ID_BASE,
  SOURCE_KEY,
  UPDATE_SOURCE_ID_BASE,
  planImport,
  planUpdate,
  prepareRecords,
  prepareUpdateRecords,
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
    expect(prepareRecords(source({ birthDate: "1953-" }))[0].birthDate).toBe(
      ""
    );
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
      {
        sourceId: records[0].sourceId,
        sourcePayload: records[0].sourcePayload,
      },
    ]);
    expect(plan.insert).toHaveLength(0);
    expect(plan.skipped).toEqual([records[0].sourceId]);
  });

  it("아무도 없으면 그대로 넣는다", () => {
    const plan = planImport(prepareRecords(source()), []);
    expect(plan.insert).toHaveLength(1);
  });

  it("동명이인 확인을 받은 경우에만 같은 이름을 넣는다", () => {
    const records = prepareRecords(source());
    const other = [
      {
        sourceId: 1,
        nameNormalized: "가상인물",
        birthDate: "1900-05-05",
        deathDate: "1985-05-05",
      },
    ];
    expect(() => planImport(records, other)).toThrow();
    expect(
      planImport(records, other, { allowExistingName: true }).insert
    ).toHaveLength(1);
  });

  it("동명이인이라 해도 생년월일이나 소천일이 같으면 멈춘다", () => {
    const records = prepareRecords(source());
    const sameBirth = [
      {
        sourceId: 1,
        nameNormalized: "가상인물",
        birthDate: "1930-01-01",
        deathDate: "1985-05-05",
      },
    ];
    const sameDeath = [
      {
        sourceId: 1,
        nameNormalized: "가상인물",
        birthDate: "1900-05-05",
        deathDate: "2000-01-01",
      },
    ];
    for (const existing of [sameBirth, sameDeath]) {
      expect(() =>
        planImport(records, existing, { allowExistingName: true })
      ).toThrow();
    }
  });
});

describe("고쳐 보낸 명단에서 추가분만 넣기 (--update)", () => {
  const TODAY = "2026-09-22";
  const upd = records => ({
    sourceKey: "interment-1995-2006-260922",
    sourceSha256: "b".repeat(64),
    records,
  });
  const row = (sourceRow, name, birthDate, deathDate) => ({
    sourceRow,
    name,
    birthDate,
    deathDate,
    note: "유가족 홍길동",
  });

  it("이미 있는 분은 건너뛰고 없는 분만 넣는다 (1995년 이전 소천도 받는다)", () => {
    const prepared = prepareUpdateRecords(
      upd([
        row(2, "가상하나", "1923-06-24", "1996-08-26"),
        row(3, "가상둘", "1901-04-12", "1994-12-12"),
        row(4, "가상셋", "1930-01-01", "2000-01-01"),
      ]),
      TODAY
    );
    const plan = planUpdate(prepared, [
      {
        sourceId: -200600004,
        nameNormalized: "가상셋",
        birthDate: "1930-01-01",
        deathDate: "2000-01-01",
      },
    ]);
    expect(plan.already).toEqual([4]);
    expect(plan.insert.map(r => r.name)).toEqual(["가상하나", "가상둘"]);
    expect(plan.insert.map(r => r.sourceId)).toEqual([
      UPDATE_SOURCE_ID_BASE - 1,
      UPDATE_SOURCE_ID_BASE - 2,
    ]);
    for (const r of plan.insert) {
      expect(r.burialPlace).toBe(BURIAL_PLACE);
      expect(r.sourcePayload).not.toContain("홍길동");
    }
  });

  it("번호는 앞서 넣은 추가분 다음부터 이어서 매긴다", () => {
    const prepared = prepareUpdateRecords(
      upd([row(2, "가상넷", "", "1999-01-01")]),
      TODAY
    );
    const plan = planUpdate(prepared, [
      {
        sourceId: UPDATE_SOURCE_ID_BASE - 5,
        nameNormalized: "다른분",
        birthDate: "",
        deathDate: "1990-01-01",
      },
    ]);
    expect(plan.insert[0].sourceId).toBe(UPDATE_SOURCE_ID_BASE - 6);
  });

  it("생년월일만 같아도 이미 있는 분으로 본다", () => {
    const prepared = prepareUpdateRecords(
      upd([row(2, "가상다섯", "1920-02-02", "2001-01-01")]),
      TODAY
    );
    const plan = planUpdate(prepared, [
      {
        sourceId: 9,
        nameNormalized: "가상다섯",
        birthDate: "1920-02-02",
        deathDate: "2002-01-01",
      },
    ]);
    expect(plan.insert).toHaveLength(0);
    expect(plan.already).toEqual([2]);
  });

  it("이름만 같고 날짜가 전부 다르면 동명이인으로 넣고 표시한다", () => {
    const prepared = prepareUpdateRecords(
      upd([row(2, "가상여섯", "1938-06-25", "1994-11-14")]),
      TODAY
    );
    const plan = planUpdate(prepared, [
      {
        sourceId: 9,
        nameNormalized: "가상여섯",
        birthDate: "1926-08-11",
        deathDate: "2019-11-09",
      },
    ]);
    expect(plan.insert).toHaveLength(1);
    expect(plan.insert[0].homonym).toBe(true);
  });

  it("날짜가 잘못됐거나 파일 안에 같은 이름이 두 번이면 보류한다", () => {
    const prepared = prepareUpdateRecords(
      upd([
        row(2, "가상일곱", "1953-02-19", "2006-12-00"),
        row(3, "가상여덟", "1914-03-10", "2000-03-16"),
        row(4, "가상여덟", "1914-03-12", "2000-11-17"),
        row(5, "가상아홉", "1905-09-10", "2027-01-01"),
      ]),
      TODAY
    );
    const plan = planUpdate(prepared, []);
    expect(plan.insert).toHaveLength(0);
    expect(plan.held.map(h => h.sourceRow).sort()).toEqual([2, 3, 4, 5]);
  });

  it("연도만 다르게 적힌 같은 분일 수 있으면 보류한다", () => {
    const prepared = prepareUpdateRecords(
      upd([
        row(2, "가상열", "1957-12-11", "2000-10-27"),
        row(3, "가상열하나", "", "1997-03-13"),
        row(4, "가상열둘", "1905-09-10", "2023-12-08"),
      ]),
      TODAY
    );
    const plan = planUpdate(prepared, [
      {
        sourceId: 9,
        nameNormalized: "가상열",
        birthDate: "1959-12-11",
        deathDate: "1996-06-16",
      },
      {
        sourceId: 10,
        nameNormalized: "가상열하나",
        birthDate: "1928-02-29",
        deathDate: "1993-05-28",
      },
    ]);
    expect(plan.insert).toHaveLength(0);
    expect(plan.held.map(h => h.sourceRow).sort()).toEqual([2, 3, 4]);
  });

  it("출처 표시가 맞지 않으면 멈춘다", () => {
    expect(() =>
      prepareUpdateRecords({ ...upd([]), sourceKey: "other" }, TODAY)
    ).toThrow();
  });
});
