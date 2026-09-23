import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const referencedKeys = vi.hoisted(() => ({ value: new Set<string>() }));
vi.mock("../db", () => ({ getDb: vi.fn() }));

import * as cleanup from "./uploadCleanup";
import {
  MIN_ORPHAN_AGE_MS,
  extractUploadKeys,
  planUploadCleanup,
  uploadCleanupMode,
} from "./uploadCleanup";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 18, 18, 0, 0); // 서울 9월 19일 새벽 3시

describe("주소에서 파일 경로 뽑기", () => {
  it("상대 주소와 전체 주소 모두 읽는다", () => {
    expect(extractUploadKeys("/uploads/gallery/1/a_b.jpg")).toEqual([
      "gallery/1/a_b.jpg",
    ]);
    expect(
      extractUploadKeys(
        '{"photo":"https://somangmemorial.co.kr/uploads/gallery/2/x.png","n":1}'
      )
    ).toEqual(["gallery/2/x.png"]);
    expect(extractUploadKeys(null)).toEqual([]);
  });

  it("기한이 적힌 주소도 실제 파일 이름으로 센다", () => {
    expect(
      extractUploadKeys("/uploads/s/1790000000.AbC-_1/family-rooms/5/a_b.jpg")
    ).toEqual(["family-rooms/5/a_b.jpg"]);
  });
});

describe("치울 목록 정하기", () => {
  const file = (key: string, ageDays = 10) => ({
    key,
    mtimeMs: NOW - ageDays * DAY,
  });

  it("DB 에 적힌 파일은 치우지 않는다", () => {
    const plan = planUploadCleanup({
      files: [file("a.jpg"), file("b.jpg")],
      referenced: new Set(["a.jpg", "zzz.jpg"]),
      now: NOW,
    });
    expect(plan).toEqual({ ok: true, toTrash: ["b.jpg"] });
  });

  it("막 올린 파일은 저장 전일 수 있어 건드리지 않는다", () => {
    const plan = planUploadCleanup({
      files: [file("a.jpg"), { key: "new.jpg", mtimeMs: NOW - MIN_ORPHAN_AGE_MS + 1000 }],
      referenced: new Set(["a.jpg"]),
      now: NOW,
    });
    expect(plan.toTrash).toEqual([]);
  });

  it("DB 를 못 읽어 아무 주소도 없으면 멈춘다", () => {
    const plan = planUploadCleanup({
      files: [file("a.jpg")],
      referenced: new Set(),
      now: NOW,
    });
    expect(plan.ok).toBe(false);
  });

  it("한꺼번에 너무 많이 치우려 하면 멈춘다", () => {
    const files = Array.from({ length: 20 }, (_, i) => file(`f${i}.jpg`));
    const plan = planUploadCleanup({
      files,
      referenced: new Set(["f0.jpg"]),
      now: NOW,
    });
    expect(plan.ok).toBe(false);
  });

  it("값이 없거나 이상하면 확인만 하는 모드로 돈다", () => {
    expect(uploadCleanupMode(undefined)).toBe("dry-run");
    expect(uploadCleanupMode("yes")).toBe("dry-run");
    expect(uploadCleanupMode("on")).toBe("on");
    expect(uploadCleanupMode("off")).toBe("off");
  });
});

describe("휴지통으로 옮기기", () => {
  let root = "";
  afterEach(() => {
    vi.restoreAllMocks();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  const makeFile = (key: string, ageDays: number) => {
    const full = path.join(root, key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, "x");
    const t = new Date(NOW - ageDays * DAY);
    fs.utimesSync(full, t, t);
  };

  const setup = () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "upload-cleanup-"));
    for (let i = 0; i < 9; i += 1) makeFile(`gallery/1/keep${i}.jpg`, 10);
    makeFile("gallery/1/deleted.jpg", 10);
    referencedKeys.value = new Set(
      Array.from({ length: 9 }, (_, i) => `gallery/1/keep${i}.jpg`)
    );
  };

  it("확인 모드에서는 아무것도 옮기지 않는다", async () => {
    setup();
    const result = await runWith("dry-run");
    expect(result.planned).toBe(1);
    expect(result.moved).toBe(0);
    expect(fs.existsSync(path.join(root, "gallery/1/deleted.jpg"))).toBe(true);
  });

  it("켜면 안 쓰는 파일만 밖에서 못 여는 휴지통으로 옮긴다", async () => {
    setup();
    const result = await runWith("on");
    expect(result.moved).toBe(1);
    expect(fs.existsSync(path.join(root, "gallery/1/deleted.jpg"))).toBe(false);
    expect(
      fs.existsSync(path.join(root, ".trash/20260919/gallery/1/deleted.jpg"))
    ).toBe(true);
    expect(fs.existsSync(path.join(root, "gallery/1/keep0.jpg"))).toBe(true);
  });

  // DB 대신 "쓰이는 파일" 목록을 직접 준다.
  async function runWith(mode: "on" | "dry-run") {
    return cleanup.runUploadCleanup({
      mode,
      root,
      now: new Date(NOW),
      referenced: referencedKeys.value,
    });
  }
});
