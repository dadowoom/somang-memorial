import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { KioskDisplayReport } from "../shared/kioskDisplay";

// 키오스크 세로 고정 설정·화면 상태 보고 (2026-10-03). 파일은 임시 폴더에만 쓴다.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "somang-kiosk-display-"));

const mocks = vi.hoisted(() => ({
  createAdminAuditLog: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});
vi.mock("./kioskDisplayStore", async () => {
  const actual = await vi.importActual<typeof import("./kioskDisplayStore")>(
    "./kioskDisplayStore"
  );
  const os = await import("os");
  const fs = await import("fs");
  const path = await import("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "somang-kiosk-router-"));
  return {
    ...actual,
    kioskDisplayStore: actual.createKioskDisplayStore({
      filePath: path.join(dir, ".settings", "kiosk-display.json"),
    }),
  };
});

import { appRouter } from "./routers";
import { createKioskDisplayStore } from "./kioskDisplayStore";

afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

const admin = { id: 9, role: "admin", approvalStatus: "approved" };
const member = { id: 7, role: "user", approvalStatus: "approved" };
let ipCounter = 0;
const caller = (user: typeof admin | null, ip = "203.0.113.10") =>
  appRouter.createCaller({
    user,
    req: { ip, headers: {}, socket: { remoteAddress: ip } },
    res: {},
  } as unknown as TrpcContext);

const report = (overrides: Partial<KioskDisplayReport> = {}): KioskDisplayReport => ({
  viewportWidth: 1920,
  viewportHeight: 1080,
  screenWidth: 1920,
  screenHeight: 1080,
  pixelRatio: 1,
  rotation: "ccw",
  reason: "rotated",
  browser: "Chrome 141 · Windows",
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("createKioskDisplayStore", () => {
  it("파일이 없으면 꺼짐·반시계로 시작한다", () => {
    const store = createKioskDisplayStore({
      filePath: path.join(tempRoot, "none", "kiosk-display.json"),
    });
    expect(store.getSettings()).toEqual({
      portraitLock: false,
      direction: "ccw",
      updatedAt: null,
    });
  });

  it("저장하면 파일에 남고, 서버를 다시 켜도(새 저장소) 읽힌다", () => {
    const filePath = path.join(tempRoot, "a", ".settings", "kiosk-display.json");
    const store = createKioskDisplayStore({
      filePath,
      now: () => new Date("2026-10-03T07:00:00.000Z"),
    });
    const result = store.saveSettings({ portraitLock: true, direction: "cw" });
    expect(result.persisted).toBe(true);
    expect(store.isPersisted()).toBe(true);
    expect(JSON.parse(fs.readFileSync(filePath, "utf-8"))).toEqual({
      portraitLock: true,
      direction: "cw",
      updatedAt: "2026-10-03T07:00:00.000Z",
    });
    // 반쯤 쓴 임시 파일이 남지 않는다.
    expect(fs.readdirSync(path.dirname(filePath))).toEqual(["kiosk-display.json"]);

    const restarted = createKioskDisplayStore({ filePath });
    expect(restarted.getSettings()).toMatchObject({
      portraitLock: true,
      direction: "cw",
    });
  });

  it("깨진 파일은 기본값으로 읽는다", () => {
    const filePath = path.join(tempRoot, "broken.json");
    fs.writeFileSync(filePath, "{ not json");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createKioskDisplayStore({ filePath });
    expect(store.getSettings()).toMatchObject({ portraitLock: false });
    spy.mockRestore();
  });

  it("파일을 쓸 수 없으면 메모리에만 두고 그렇다고 알린다", () => {
    const blocker = path.join(tempRoot, "blocker");
    fs.writeFileSync(blocker, "파일이라 폴더를 만들 수 없다");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createKioskDisplayStore({
      filePath: path.join(blocker, ".settings", "kiosk-display.json"),
    });
    const result = store.saveSettings({ portraitLock: true, direction: "ccw" });
    spy.mockRestore();
    expect(result.persisted).toBe(false);
    expect(store.isPersisted()).toBe(false);
    // 메모리의 값이 계속 쓰인다(다시 읽어 기본값으로 돌아가지 않는다).
    expect(store.getSettings()).toMatchObject({ portraitLock: true });
  });

  it("다른 서버가 파일을 바꾸면 잠시 뒤 따라간다", () => {
    const filePath = path.join(tempRoot, "shared", "kiosk-display.json");
    let clock = Date.parse("2026-10-03T07:00:00.000Z");
    const now = () => new Date(clock);
    const a = createKioskDisplayStore({ filePath, now });
    const b = createKioskDisplayStore({ filePath, now });
    expect(b.getSettings().portraitLock).toBe(false);
    a.saveSettings({ portraitLock: true, direction: "ccw" });
    expect(b.getSettings().portraitLock).toBe(false);
    clock += 16 * 1000;
    expect(b.getSettings().portraitLock).toBe(true);
  });

  it("보고는 기기마다 마지막 1건, 최신이 먼저, 최대 개수까지만", () => {
    let clock = 0;
    const store = createKioskDisplayStore({
      filePath: path.join(tempRoot, "reports.json"),
      now: () => new Date(Date.UTC(2026, 9, 3, 7, 0, clock++)),
      maxDevices: 2,
    });
    store.recordReport(report());
    store.recordReport(report({ reason: "setting-off", rotation: null }));
    expect(store.listReports()).toHaveLength(1);
    expect(store.listReports()[0].reason).toBe("setting-off");

    store.recordReport(report({ screenWidth: 390, screenHeight: 844, browser: "Safari 18 · iOS" }));
    store.recordReport(report({ screenWidth: 1080, screenHeight: 1920 }));
    const list = store.listReports();
    expect(list).toHaveLength(2);
    expect(list.map(item => item.screenWidth)).toEqual([1080, 390]);
  });
});

describe("kioskDisplay 라우터", () => {
  it("키오스크는 로그인 없이 켬/끔·방향만 읽는다", async () => {
    await expect(caller(null).kioskDisplay.settings()).resolves.toEqual({
      portraitLock: false,
      direction: "ccw",
    });
  });

  it("관리자만 바꿀 수 있고, 바꾸면 관리 기록을 남긴다", async () => {
    await expect(
      caller(member).kioskDisplay.adminUpdate({ portraitLock: true, direction: "ccw" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(null).kioskDisplay.adminGet()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();

    const result = await caller(admin).kioskDisplay.adminUpdate({
      portraitLock: true,
      direction: "cw",
    });
    expect(result).toMatchObject({
      persisted: true,
      settings: { portraitLock: true, direction: "cw" },
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: 9,
      action: "kioskDisplay.update",
      beforeValue: "끔 · 반시계 방향",
      afterValue: "켬 · 시계 방향",
      note: "키오스크 세로 고정 설정 변경",
    });
    await expect(caller(null).kioskDisplay.settings()).resolves.toEqual({
      portraitLock: true,
      direction: "cw",
    });
  });

  it("화면 상태 보고를 받아 관리자 화면에 보여 준다", async () => {
    await expect(
      caller(null, `198.51.100.${++ipCounter}`).kioskDisplay.report(report())
    ).resolves.toEqual({ ok: true });
    const view = await caller(admin).kioskDisplay.adminGet();
    expect(view.reports[0]).toMatchObject({
      viewportWidth: 1920,
      viewportHeight: 1080,
      rotation: "ccw",
      reason: "rotated",
      browser: "Chrome 141 · Windows",
    });
    expect(typeof view.reports[0].receivedAt).toBe("string");
  });

  it("이상한 보고는 받지 않는다", async () => {
    await expect(
      caller(null).kioskDisplay.report(
        report({ browser: "x".repeat(200) })
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(null).kioskDisplay.report(
        report({ viewportWidth: -1 })
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("한 접속지에서 너무 자주 보내면 조용히 버린다", async () => {
    const ip = "192.0.2.77";
    const results = [];
    for (let index = 0; index < 32; index += 1) {
      results.push(
        await caller(null, ip).kioskDisplay.report(
          report({ screenWidth: 3000 + index })
        )
      );
    }
    expect(results.slice(0, 30).every(item => item.ok)).toBe(true);
    expect(results.slice(30)).toEqual([{ ok: false }, { ok: false }]);
  });
});
