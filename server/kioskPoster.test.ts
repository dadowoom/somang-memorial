import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 2026-09-15: 키오스크 대기(광고) 화면 포스터. 관리자가 바꾼 일은 모두
// 감사기록에 남고, 키오스크가 읽는 목록에는 필요한 값만 내려간다.
const mocks = vi.hoisted(() => ({
  createAdminAuditLog: vi.fn(),
  listActiveKioskPosters: vi.fn(),
  listAllKioskPosters: vi.fn(),
  getKioskPosterById: vi.fn(),
  createKioskPoster: vi.fn(),
  updateKioskPoster: vi.fn(),
  deleteKioskPoster: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const admin = {
  id: 9,
  role: "admin",
  approvalStatus: "approved",
  email: "admin@example.org",
};
const member = {
  id: 7,
  role: "user",
  approvalStatus: "approved",
  email: "somang@example.org",
};

const fakeReq = { ip: "127.0.0.1", headers: {}, socket: {} };
const fakeRes = { clearCookie: vi.fn() };
const context = (user: typeof admin | null): TrpcContext =>
  ({ user, req: fakeReq, res: fakeRes }) as unknown as TrpcContext;
const caller = (user: typeof admin | null) =>
  appRouter.createCaller(context(user));

const poster = {
  id: 4,
  imageUrl: "/uploads/kiosk-posters/abc_1234.jpg",
  imageKey: "kiosk-posters/abc_1234.jpg",
  caption: "추모 예배 안내",
  displaySeconds: 8,
  sortOrder: 2,
  isActive: 1,
  createdAt: new Date("2026-09-15T00:00:00Z"),
  updatedAt: new Date("2026-09-15T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getKioskPosterById.mockResolvedValue(poster);
  mocks.listAllKioskPosters.mockResolvedValue([poster]);
  mocks.listActiveKioskPosters.mockResolvedValue([poster]);
});

describe("kioskPoster.list", () => {
  it("키오스크에는 화면에 필요한 값만 내려간다", async () => {
    await expect(caller(null).kioskPoster.list()).resolves.toEqual([
      {
        id: 4,
        imageUrl: "/uploads/kiosk-posters/abc_1234.jpg",
        caption: "추모 예배 안내",
        displaySeconds: 8,
      },
    ]);
    // 파일 저장 경로(imageKey)는 화면에 내보내지 않는다.
    expect(mocks.listActiveKioskPosters).toHaveBeenCalledTimes(1);
  });
});

describe("kioskPoster.update 감사기록", () => {
  it("보여 줄 시간을 바꾸면 전후 값이 남는다", async () => {
    await expect(
      caller(admin).kioskPoster.update({ id: 4, displaySeconds: 15 })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateKioskPoster).toHaveBeenCalledWith(4, {
      displaySeconds: 15,
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: 9,
      action: "kioskPoster.update",
      beforeValue: "사용 · 순서 2 · 8초",
      afterValue: "사용 · 순서 2 · 15초",
      note: "키오스크 광고 4 수정",
    });
  });

  it("중지하면 상태가 바뀐 것으로 남는다", async () => {
    await expect(
      caller(admin).kioskPoster.update({ id: 4, isActive: false })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateKioskPoster).toHaveBeenCalledWith(4, { isActive: 0 });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "kioskPoster.update",
        beforeValue: "사용 · 순서 2 · 8초",
        afterValue: "중지 · 순서 2 · 8초",
      })
    );
  });

  it("없는 광고는 바꾸지도 기록하지도 않는다", async () => {
    mocks.getKioskPosterById.mockResolvedValue(null);
    await expect(
      caller(admin).kioskPoster.update({ id: 999, displaySeconds: 10 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.updateKioskPoster).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("너무 짧은 시간은 받지 않는다", async () => {
    await expect(
      caller(admin).kioskPoster.update({ id: 4, displaySeconds: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateKioskPoster).not.toHaveBeenCalled();
  });
});

describe("kioskPoster.delete 감사기록", () => {
  it("지우면 어떤 광고였는지 남는다", async () => {
    await expect(caller(admin).kioskPoster.delete({ id: 4 })).resolves.toEqual({
      success: true,
    });
    expect(mocks.deleteKioskPoster).toHaveBeenCalledWith(4);
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: 9,
      action: "kioskPoster.delete",
      beforeValue: "사용 · 순서 2 · 8초",
      note: "키오스크 광고 4 삭제 · kiosk-posters/abc_1234.jpg",
    });
  });

  it("없는 광고는 지우지도 기록하지도 않는다", async () => {
    mocks.getKioskPosterById.mockResolvedValue(null);
    await expect(
      caller(admin).kioskPoster.delete({ id: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.deleteKioskPoster).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});

describe("관리자만 바꿀 수 있다", () => {
  it("일반 회원은 목록을 보지 못한다", async () => {
    await expect(caller(member).kioskPoster.adminList()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("일반 회원은 지우지 못한다", async () => {
    await expect(
      caller(member).kioskPoster.delete({ id: 4 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.deleteKioskPoster).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("로그인하지 않으면 올리지 못한다", async () => {
    await expect(
      caller(null).kioskPoster.update({ id: 4, displaySeconds: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateKioskPoster).not.toHaveBeenCalled();
  });
});
