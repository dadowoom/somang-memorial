import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { toKioskInterment } from "../shared/kioskInterment";

const query = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  leftJoin: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => query }));
import { searchKioskSomangIntermentRecords } from "./db";

const record = {
  id: 7,
  name: "김테스트 권사",
  role: "권사",
  birthDate: "0000-00-00",
  deathDate: "2020-05-20",
  burialPlace: "가구역 12",
  burialDate: "2020-05-22",
  memorialSlug: null,
};

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "mysql://test-only");
  vi.clearAllMocks();
  for (const method of [
    query.select,
    query.from,
    query.leftJoin,
    query.where,
    query.orderBy,
  ])
    method.mockReturnValue(query);
  query.limit.mockResolvedValue([record]);
});
afterAll(() => vi.unstubAllEnvs());

describe("키오스크 안장 기록", () => {
  it("연결된 추모관과 사진이 없어도 기본 정보가 표시된다", async () => {
    const rows = await searchKioskSomangIntermentRecords("김테스트");
    expect(rows.map(toKioskInterment)).toEqual([
      {
        id: 7,
        name: "김테스트",
        role: "권사",
        birthDate: null,
        deathDate: "2020-05-20",
        burialPlace: "가구역 12",
        burialDate: "2020-05-22",
        message: "소망교회 소망동산에 안장되어 있습니다.",
        href: null,
      },
    ]);
  });

  it("연결 조회는 공개·게시된 추모관만 허용한다", async () => {
    await searchKioskSomangIntermentRecords("김테스트");
    const sql = new MySqlDialect().sqlToQuery(query.leftJoin.mock.calls[0][1]);
    expect(sql.sql).toContain(
      "`memorials`.`intermentRecordId` = `somang_interment_records`.`id`"
    );
    expect(sql.sql).toContain("`memorials`.`visibility` = ?");
    expect(sql.sql).toContain("`memorials`.`status` = ?");
    expect(sql.params).toEqual(["public", "published"]);
  });

  it("부분 이름 검색에서도 와일드카드는 글자 그대로 처리한다", async () => {
    await searchKioskSomangIntermentRecords("김 %_");
    const sql = new MySqlDialect().sqlToQuery(query.where.mock.calls[0][0]);
    expect(sql.params).toEqual(["%김\\%\\_%"]);
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("원본 자료와 담당자 정보는 응답에서 제외한다", () => {
    const result = toKioskInterment({
      ...record,
      sourcePayload: "private",
      pastor: "private",
    } as typeof record);
    expect(result).not.toHaveProperty("sourcePayload");
    expect(result).not.toHaveProperty("pastor");
    expect(query.select).not.toHaveBeenCalled();
  });

  it("연결된 공개 추모관은 기존 키오스크 주소를 사용한다", () => {
    expect(
      toKioskInterment({ ...record, memorialSlug: "test-public" }).href
    ).toBe("/kiosk/memorial/test-public");
  });

  it("누락·잘못된 날짜와 빈 위치를 만들어 내지 않는다", () => {
    expect(
      toKioskInterment({
        ...record,
        deathDate: "2020-02-31",
        burialDate: "0000-00-00",
        burialPlace: " ",
      })
    ).toMatchObject({
      birthDate: null,
      deathDate: null,
      burialDate: null,
      burialPlace: null,
    });
  });
});
