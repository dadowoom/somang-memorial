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
  it("장지가 없거나 다른 곳인 자료를 소망동산으로 안내하지 않는다", () => {
    expect(toKioskInterment({ ...record, burialPlace: "" }).message).toBe(
      "안장 장소 미등록"
    );
    expect(
      toKioskInterment({ ...record, burialPlace: "금촌 기독묘원" }).message
    ).toBe("소망동산이 아닌 다른 곳에 모셔졌습니다.");
    expect(
      toKioskInterment({ ...record, burialPlace: "소망동산" }).message
    ).toBe("소망교회 소망동산에 안장되어 있습니다.");
  });
  it("연결된 추모관과 사진이 없어도 기본 정보가 표시된다", async () => {
    const rows = await searchKioskSomangIntermentRecords("김테스트");
    expect(rows.map(toKioskInterment)).toEqual([
      {
        name: "김테스트",
        role: "권사",
        birthDate: null,
        deathDate: "2020-05-20",
        burialPlace: "다른 장지",
        burialDate: "2020-05-22",
        message: "소망동산이 아닌 다른 곳에 모셔졌습니다.",
        href: null,
      },
    ]);
  });

  it("기록 번호는 키오스크로 내보내지 않는다", async () => {
    const rows = await searchKioskSomangIntermentRecords("김테스트");
    expect(rows.map(toKioskInterment)[0]).not.toHaveProperty("id");
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

  it("장지 원문(화장장·시각·선산 주소)은 공개 화면에 내보내지 않는다", () => {
    const other = toKioskInterment({
      ...record,
      burialPlace: "충남 예산군 봉산면 봉림리 선영 안장/홍성추모공원 08:00 화장",
    });
    expect(other.burialPlace).toBe("다른 장지");
    expect(JSON.stringify(other)).not.toContain("봉림리");
    const somang = toKioskInterment({
      ...record,
      burialPlace: "소망동산(원지동 09:10)",
    });
    expect(somang.burialPlace).toBe("소망동산");
    expect(JSON.stringify(somang)).not.toContain("09:10");
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
