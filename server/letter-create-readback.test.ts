import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

// 편지를 저장한 직후에는 방금 저장한 번호로 다시 읽는다 (2026-09-23).
// "가장 최근 편지"로 읽으면 같은 순간 다른 분이 쓴 편지가 대신 보일 수 있다.
const fake = vi.hoisted(() => {
  const wheres: unknown[] = [];
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    orderBy: () => chain,
    where: (condition: unknown) => {
      wheres.push(condition);
      return chain;
    },
    limit: async () => [{ id: 42, author: "가상인" }],
    insert: () => ({ values: async () => [{ insertId: 42 }] }),
  });
  return { chain, wheres };
});
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fake.chain }));
import { createMemorialLetter } from "./db";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "mysql://test-only");
  fake.wheres.length = 0;
});
afterAll(() => vi.unstubAllEnvs());

const render = (condition: unknown) =>
  new MySqlDialect().sqlToQuery(condition as never);

describe("편지 저장 직후 다시 읽기", () => {
  it("추모관 편지는 방금 저장한 편지 번호로 읽는다", async () => {
    await createMemorialLetter({
      memorialSlug: "gasang",
      author: "가상인",
      content: "보고 싶습니다",
    });
    const last = render(fake.wheres.at(-1));
    expect(last.sql).toContain("`memorial_letters`.`id` = ?");
    expect(last.params).toEqual([42]);
  });

  it("받는 분만 적은 편지도 방금 저장한 편지 번호로 읽는다", async () => {
    await createMemorialLetter({
      recipientName: "가상 어머니",
      author: "가상인",
      content: "보고 싶습니다",
    });
    const last = render(fake.wheres.at(-1));
    expect(last.sql).toContain("`memorial_letters`.`id` = ?");
    expect(last.params).toEqual([42]);
  });
});
