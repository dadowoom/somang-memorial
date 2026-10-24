import { describe, expect, it, vi } from "vitest";
import { reserveAccountUpload, seoulUploadDay } from "./uploadQuota";

function fakeTransaction(
  affected: number,
  usage = { dayKey: "2026-10-24", dayCount: 1 }
) {
  const execute = vi.fn().mockResolvedValue([{ affectedRows: affected }]);
  let selection = 0;
  const select = vi.fn(() => ({
    from: () => ({
      where: () => {
        selection += 1;
        const rows = selection === 1 ? [{ id: 7 }] : [usage];
        return {
          limit: async () => rows,
          then: (resolve: (value: typeof rows) => void) => resolve(rows),
        };
      },
    }),
  }));
  const insert = vi.fn(() => ({
    values: () => ({ onDuplicateKeyUpdate: async () => [{ affectedRows: 1 }] }),
  }));
  return { tx: { execute, select, insert } as never, execute, insert };
}

describe("account upload reservation", () => {
  const now = new Date("2026-10-24T03:00:00.000Z");
  it("uses the Seoul calendar day", () => {
    expect(seoulUploadDay(new Date("2026-10-23T15:00:00Z"))).toBe("2026-10-24");
  });
  it("accepts only an affected conditional update", async () => {
    const { tx, execute } = fakeTransaction(1);
    await reserveAccountUpload(tx, 7, 40, now, { bytes: 100, dailyCount: 2 });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it("rejects when the same-day count reached the limit", async () => {
    const { tx } = fakeTransaction(0, { dayKey: "2026-10-24", dayCount: 2 });
    await expect(
      reserveAccountUpload(tx, 7, 40, now, { bytes: 100, dailyCount: 2 })
    ).rejects.toThrow(/오늘은 더/);
  });
  it("rejects when the byte reservation affects no row", async () => {
    const { tx } = fakeTransaction(0);
    await expect(
      reserveAccountUpload(tx, 7, 40, now, { bytes: 100, dailyCount: 2 })
    ).rejects.toThrow(/저장 공간/);
  });
  it("does not reserve an oversized upload", async () => {
    const { tx, execute, insert } = fakeTransaction(1);
    await expect(
      reserveAccountUpload(tx, 7, 101, now, { bytes: 100, dailyCount: 2 })
    ).rejects.toThrow(/저장 공간/);
    expect(insert).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
