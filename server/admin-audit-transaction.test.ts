import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// 관리자 작업과 관리 기록은 한 묶음 (2026-09-23, 계획서 L-4). 묶음 안에서
// 무엇이 일어났는지 순서대로 적는 가짜 DB 로 확인한다. 기록 저장이 실패하면
// 묶음 전체가 되돌려져야 하므로, 여기서는 "같은 묶음(tx) 안에서 저장했는지"를 본다.
const fake = vi.hoisted(() => {
  const state = {
    admins: [] as { id: number }[],
    steps: [] as string[],
    insertFails: false,
  };
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          for: async (mode: string) => {
            state.steps.push(`lock-admins:${mode}`);
            return state.admins;
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.steps.push(`tx-update:${Object.keys(values).join(",")}`);
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        state.steps.push("tx-delete");
      },
    }),
    insert: () => ({
      values: async (values: unknown) => {
        if (state.insertFails) throw new Error("audit insert failed");
        const list = Array.isArray(values) ? values : [values];
        for (const value of list) {
          state.steps.push(`tx-audit:${(value as { action: string }).action}`);
        }
        return [{ insertId: 41 }];
      },
    }),
  };
  const db = {
    transaction: async (fn: (t: typeof tx) => unknown) => {
      state.steps.push("begin");
      try {
        const result = await fn(tx);
        state.steps.push("commit");
        return result;
      } catch (error) {
        state.steps.push("rollback");
        throw error;
      }
    },
  };
  return { state, db };
});
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fake.db }));

import {
  deleteMemorialById,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "./db";

const audit = (action: string) => ({
  adminUserId: 9,
  targetUserId: 7,
  action,
  note: "시험",
});

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "mysql://test-only");
  fake.state.steps = [];
  fake.state.admins = [{ id: 7 }, { id: 9 }];
  fake.state.insertFails = false;
});
afterAll(() => vi.unstubAllEnvs());

describe("권한 변경", () => {
  it("관리자 행을 잠그고 다시 센 뒤, 바꾸기와 기록을 한 묶음으로 저장한다", async () => {
    await expect(
      updateAdminUserRole(7, "user", audit("user.role.update"))
    ).resolves.toEqual({ ok: true });
    expect(fake.state.steps).toEqual([
      "begin",
      "lock-admins:update",
      "tx-update:role",
      "tx-audit:user.role.update",
      "commit",
    ]);
  });

  it("동시에 내려서 마지막 관리자가 되면 바꾸지도 기록하지도 않는다", async () => {
    fake.state.admins = [{ id: 7 }];
    await expect(
      updateAdminUserRole(7, "user", audit("user.role.update"))
    ).resolves.toEqual({ ok: false, reason: "last-admin" });
    expect(fake.state.steps).not.toContain("tx-update:role");
    expect(fake.state.steps).not.toContain("tx-audit:user.role.update");
  });

  it("관리자로 올릴 때는 관리자 수를 세지 않는다", async () => {
    await updateAdminUserRole(3, "admin", audit("user.role.update"));
    expect(fake.state.steps).not.toContain("lock-admins:update");
  });

  it("기록 저장이 실패하면 권한 변경도 되돌린다", async () => {
    fake.state.insertFails = true;
    await expect(
      updateAdminUserRole(7, "user", audit("user.role.update"))
    ).rejects.toThrow("audit insert failed");
    expect(fake.state.steps.at(-1)).toBe("rollback");
  });
});

describe("상태 변경·추모관 삭제", () => {
  it("가입 상태 변경과 기록을 한 묶음으로 저장한다", async () => {
    await updateAdminUserStatus(7, "rejected", audit("user.status.update"));
    expect(fake.state.steps).toEqual([
      "begin",
      "tx-update:approvalStatus,approvedAt",
      "tx-audit:user.status.update",
      "commit",
    ]);
  });

  it("추모관 삭제와 기록을 한 묶음으로 저장하고 기록 번호를 돌려준다", async () => {
    await expect(deleteMemorialById(5, audit("memorial.delete"))).resolves.toBe(
      41
    );
    expect(fake.state.steps).toEqual([
      "begin",
      "tx-delete",
      "tx-audit:memorial.delete",
      "commit",
    ]);
  });
});
