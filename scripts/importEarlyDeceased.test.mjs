import { describe, it, expect } from "vitest";
import {
  prepareRecords,
  planImport,
  SOURCE_KEY,
} from "./importEarlyDeceased.mjs";
const source = (changes = {}) => ({
  sourceKey: SOURCE_KEY,
  sourceSha256: "a".repeat(64),
  records: [
    {
      sourceRow: 2,
      name: "가상인물",
      birthDate: "9999-01-01",
      deathDate: "1999-01-01",
      burialPlace: "",
      telephone: "secret",
      ...changes,
    },
  ],
});
describe("early deceased import", () => {
  it("omits unknown dates and phone data without inventing burial", () => {
    const [r] = prepareRecords(source());
    expect(r.birthDate).toBe("");
    expect(r.burialPlace).toBe("");
    expect(JSON.stringify(r)).not.toContain("secret");
    expect(r.sourceId).toBeLessThan(0);
  });
  it("retains a valid date and different cemetery", () => {
    expect(
      prepareRecords(
        source({ birthDate: "1920-01-01", burialPlace: "다른 묘원" })
      )[0]
    ).toMatchObject({ birthDate: "1920-01-01", burialPlace: "다른 묘원" });
  });
  it("rejects invalid death dates", () =>
    expect(() =>
      prepareRecords(source({ deathDate: "1999-02-30" }))
    ).toThrow());
  it("rejects duplicate source rows", () => {
    const s = source();
    s.records.push(s.records[0]);
    expect(() => prepareRecords(s)).toThrow();
  });
  it("is idempotent", () => {
    const records = prepareRecords(source());
    expect(planImport(records, records)).toEqual({
      insert: [],
      skipped: [records[0].sourceId],
    });
  });
  it("does not overwrite a colliding source", () => {
    const records = prepareRecords(source());
    expect(() =>
      planImport(records, [{ ...records[0], sourcePayload: "changed" }])
    ).toThrow();
  });
  it("blocks possible duplicate people", () => {
    const records = prepareRecords(source());
    expect(() =>
      planImport(records, [{ ...records[0], sourceId: 1 }])
    ).toThrow();
  });
  it("keeps namesakes with different dates", () => {
    const records = prepareRecords(source());
    expect(
      planImport(records, [
        { ...records[0], sourceId: 1, deathDate: "1981-01-01" },
      ]).insert
    ).toHaveLength(1);
  });
});
