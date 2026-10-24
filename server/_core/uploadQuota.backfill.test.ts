import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountUploads, uploadQuotaBootstrap } from "../../drizzle/schema";

const root = path.join(
  process.cwd(),
  `.upload-quota-backfill-test-${process.pid}`
);
vi.mock("../storage", () => ({
  UPLOAD_DIR: process.cwd() + "/.upload-quota-backfill-test-" + process.pid,
  storagePut: vi.fn(),
}));
vi.mock("../db", () => ({ getDb: vi.fn() }));

import { getDb } from "../db";
import { prepareUploadQuota } from "./uploadQuota";

type LegacyRow = { userId: number | null; storageKey: string; createdAt: Date };

function fakeDb(legacy: LegacyRow[]) {
  const inserted: { userId: number; storageKey: string; bytes: number }[] = [];
  let completedAt: Date | null = null;
  const tx = {
    execute: vi.fn().mockImplementation(async () => [legacy, []]),
    insert: vi.fn((table: unknown) => ({
      values: (value: {
        userId: number;
        storageKey: string;
        bytes: number;
      }) => ({
        onDuplicateKeyUpdate: async () => {
          if (table === accountUploads) inserted.push(value);
        },
      }),
    })),
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where: () => ({
          for: async () =>
            table === uploadQuotaBootstrap ? [{ completedAt }] : [],
          groupBy: async () => [],
          then: (resolve: (rows: never[]) => void) => resolve([]),
        }),
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: (value: { completedAt?: Date }) => ({
        where: async () => {
          if (table === uploadQuotaBootstrap)
            completedAt = value.completedAt ?? null;
        },
      }),
    })),
  };
  const db = {
    execute: vi.fn().mockResolvedValue([[], []]),
    transaction: async (run: (tx: typeof tx) => Promise<void>) => run(tx),
    select: tx.select,
  };
  vi.mocked(getDb).mockResolvedValue(db as never);
  return {
    inserted,
    get completedAt() {
      return completedAt;
    },
  };
}

function writeFile(key: string, content: string, trashDay?: string) {
  const file = path.join(root, ...(trashDay ? [".trash", trashDay] : []), key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

const row = (userId: number | null, key: string): LegacyRow => ({
  userId,
  storageKey: `/uploads/${key}`,
  createdAt: new Date("2026-10-01T00:00:00Z"),
});

describe("legacy upload quota backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.mkdirSync(root, { recursive: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("counts a trashed photo and thumbnail, and logs ownerless photos", async () => {
    writeFile("gallery/photo.jpg", "photo", "20261001");
    writeFile("gallery/photo.thumb.jpg", "thumb", "20261001");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = fakeDb([
      row(7, "gallery/photo.jpg"),
      row(null, "gallery/lost.jpg"),
    ]);

    await prepareUploadQuota();

    expect(db.inserted).toEqual([
      { userId: 7, storageKey: "gallery/photo.jpg", bytes: 10, createdAt: new Date("2026-10-01T00:00:00Z") },
    ]);
    expect(db.completedAt).toBeInstanceOf(Date);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("소유자 없는 사진 1건")
    );
  });

  it("keeps startup running and retries after an original file read error", async () => {
    const file = writeFile("gallery/photo.jpg", "photo");
    const db = fakeDb([row(7, "gallery/photo.jpg")]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stat = fs.statSync;
    const fail = vi.spyOn(fs, "statSync").mockImplementation(((
      name: fs.PathLike
    ) => {
      if (String(name) === file)
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      return stat(name);
    }) as typeof fs.statSync);

    await expect(prepareUploadQuota()).resolves.toBeUndefined();
    expect(db.completedAt).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("파일 읽기 오류 1건")
    );

    fail.mockRestore();
    await prepareUploadQuota();
    expect(db.inserted).toEqual([
      { userId: 7, storageKey: "gallery/photo.jpg", bytes: 5, createdAt: new Date("2026-10-01T00:00:00Z") },
    ]);
    expect(db.completedAt).toBeInstanceOf(Date);
  });

  it("also retries when the thumbnail read fails", async () => {
    writeFile("gallery/photo.jpg", "photo");
    const thumb = writeFile("gallery/photo.thumb.jpg", "thumb");
    const db = fakeDb([row(7, "gallery/photo.jpg")]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const stat = fs.statSync;
    vi.spyOn(fs, "statSync").mockImplementation(((name: fs.PathLike) => {
      if (String(name) === thumb)
        throw Object.assign(new Error("device error"), { code: "EIO" });
      return stat(name);
    }) as typeof fs.statSync);

    await expect(prepareUploadQuota()).resolves.toBeUndefined();
    expect(db.completedAt).toBeNull();
    expect(db.inserted).toEqual([]);
  });
});
