import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// 비밀번호 재설정 링크는 한 번만 (2026-09-23). 링크를 먼저 닫고, 닫혔을 때만
// 비밀번호를 바꾼다. DB 는 가짜로 대신한다.
const fake = vi.hoisted(() => {
  const state = {
    tokenRow: null as null | Record<string, unknown>,
    closeAffected: 1,
    updates: [] as string[],
  };
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (state.tokenRow ? [state.tokenRow] : []),
  };
  const tx = {
    update: (table: { [key: symbol]: unknown }) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          const kind = "usedAt" in values ? "close-link" : "change-password";
          state.updates.push(kind);
          return [
            { affectedRows: kind === "close-link" ? state.closeAffected : 1 },
          ];
        },
      }),
    }),
  };
  const db = {
    ...chain,
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  return { state, db };
});
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fake.db }));
import { resetPasswordWithToken } from "./db";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "mysql://test-only");
  fake.state.updates = [];
  fake.state.closeAffected = 1;
  fake.state.tokenRow = {
    id: 1,
    userId: 9,
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
  };
});
afterAll(() => vi.unstubAllEnvs());

describe("비밀번호 재설정 링크는 한 번만", () => {
  it("링크를 먼저 닫고, 닫혔으면 비밀번호를 바꾼다", async () => {
    expect(
      await resetPasswordWithToken({ token: "t", password: "새비밀번호2026" })
    ).toBe(true);
    expect(fake.state.updates).toEqual(["close-link", "change-password"]);
  });

  it("같은 순간 다른 요청이 먼저 닫았으면 비밀번호를 바꾸지 않는다", async () => {
    fake.state.closeAffected = 0;
    expect(
      await resetPasswordWithToken({ token: "t", password: "새비밀번호2026" })
    ).toBe(false);
    expect(fake.state.updates).toEqual(["close-link"]);
  });

  it("이미 쓴 링크, 기한 지난 링크는 아무것도 바꾸지 않는다", async () => {
    fake.state.tokenRow = { ...fake.state.tokenRow, usedAt: new Date() };
    expect(
      await resetPasswordWithToken({ token: "t", password: "x1234567" })
    ).toBe(false);
    fake.state.tokenRow = {
      ...fake.state.tokenRow,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    };
    expect(
      await resetPasswordWithToken({ token: "t", password: "x1234567" })
    ).toBe(false);
    expect(fake.state.updates).toEqual([]);
  });
});
