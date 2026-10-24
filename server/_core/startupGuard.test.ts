import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { assertRevokedSessionsTable } from "./startupGuard";

vi.mock("../db", () => ({ getDb: vi.fn() }));

describe("revoked_sessions startup check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to start without a database", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(assertRevokedSessionsTable()).rejects.toThrow("DB에 연결");
  });

  it("refuses to start before migration 0032", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("table does not exist"));
    const from = vi.fn().mockReturnValue({ limit });
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from }) } as never);
    await expect(assertRevokedSessionsTable()).rejects.toThrow("마이그레이션 0032 먼저");
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("starts when the table can be queried, even if it is empty", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ limit });
    vi.mocked(getDb).mockResolvedValue({ select: () => ({ from }) } as never);
    await expect(assertRevokedSessionsTable()).resolves.toBeUndefined();
  });
});
