import { describe, expect, it } from "vitest";
import { assertUploadQuota } from "./uploadQuota";

const now = new Date("2026-10-24T03:00:00.000Z");
const upload = (
  bytes: number,
  createdAt = now,
  purgedAt: Date | null = null
) => ({ bytes, createdAt, purgedAt });

describe("account upload limits", () => {
  it("rejects bytes above the account limit", () => {
    expect(() =>
      assertUploadQuota([upload(90)], 11, now, { bytes: 100, dailyCount: 100 })
    ).toThrow(/저장 공간/);
  });

  it("deleting and uploading repeatedly cannot free bytes or today's attempts", () => {
    // Deleting a gallery row leaves the upload record active while its file is retained.
    const deletedPhotos = [upload(40), upload(40), upload(20)];
    expect(() =>
      assertUploadQuota(deletedPhotos, 1, now, { bytes: 100, dailyCount: 100 })
    ).toThrow(/저장 공간/);
    expect(() =>
      assertUploadQuota(deletedPhotos, 1, now, { bytes: 1000, dailyCount: 3 })
    ).toThrow(/오늘은 더/);
  });

  it("releases space only after physical purge, while keeping today's count", () => {
    const purged = [upload(100, now, now)];
    expect(() =>
      assertUploadQuota(purged, 100, now, { bytes: 100, dailyCount: 2 })
    ).not.toThrow();
    expect(() =>
      assertUploadQuota(purged, 1, now, { bytes: 100, dailyCount: 1 })
    ).toThrow(/오늘은 더/);
  });
});
