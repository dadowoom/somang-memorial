import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

// 관리자가 취소한 추도일 알림 신청은 30일 뒤 지운다 (2026-09-23).
const fake = vi.hoisted(() => {
  const state = { where: null as unknown };
  const db = {
    delete: () => ({
      where: async (condition: unknown) => {
        state.where = condition;
        return [{ affectedRows: 2 }];
      },
    }),
  };
  return { state, db };
});
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fake.db }));
import { purgeCancelledReminderSubscriptions } from "./db";

beforeEach(() => vi.stubEnv("DATABASE_URL", "mysql://test-only"));
afterAll(() => vi.unstubAllEnvs());

describe("취소된 추도일 알림 신청 정리", () => {
  it("취소된 지 30일 지난 신청만 지운다", async () => {
    const now = new Date("2026-10-31T00:00:00Z");
    expect(await purgeCancelledReminderSubscriptions(now)).toBe(2);
    const q = new MySqlDialect().sqlToQuery(fake.state.where as never);
    expect(q.sql).toContain("`memorial_reminder_subscriptions`.`status` = ?");
    expect(q.sql).toContain(
      "`memorial_reminder_subscriptions`.`updatedAt` < ?"
    );
    expect(q.params[0]).toBe("cancelled");
    expect((q.params[1] as Date).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});
