import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 2026-09-14: 편지 숨김/게시, 문자 알림 취소/복구, 회원 탈퇴도 감사기록을 남긴다.
const mocks = vi.hoisted(() => ({
  createAdminAuditLog: vi.fn(),
  getAdminMemorialLetterById: vi.fn(),
  updateMemorialLetterStatus: vi.fn(),
  getReminderSubscriptionById: vi.fn(),
  updateReminderSubscriptionStatus: vi.fn(),
  deleteUserAccount: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminMemorialLetterById.mockResolvedValue({
    id: 31,
    author: "둘째 딸",
    status: "published",
    memorialSlug: "kim-somang-kwonsa",
    memorialName: "김소망",
  });
  mocks.getReminderSubscriptionById.mockResolvedValue({
    id: 5,
    phone: "010-1234-5678",
    status: "active",
    memorialSlug: "kim-somang-kwonsa",
    memorialName: "김소망",
  });
  mocks.deleteUserAccount.mockResolvedValue(true);
});

describe("letter.updateStatus 감사기록", () => {
  it("편지를 숨기면 어느 편지를 누가 숨겼는지 남는다", async () => {
    await expect(
      caller(admin).letter.updateStatus({ id: 31, status: "hidden" })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateMemorialLetterStatus).toHaveBeenCalledWith(31, "hidden");
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: 9,
      action: "letter.status.update",
      beforeValue: "published",
      afterValue: "hidden",
      note: "편지 31 · 둘째 딸 → 김소망 (kim-somang-kwonsa)",
    });
  });

  it("없는 편지는 바꾸지도 기록하지도 않는다", async () => {
    mocks.getAdminMemorialLetterById.mockResolvedValue(null);
    await expect(
      caller(admin).letter.updateStatus({ id: 999, status: "hidden" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.updateMemorialLetterStatus).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("일반 회원은 편지 상태를 못 바꾼다", async () => {
    await expect(
      caller(member).letter.updateStatus({ id: 31, status: "hidden" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});

describe("reminder.updateStatus 감사기록", () => {
  it("문자 알림을 취소하면 번호를 가린 채 기록한다", async () => {
    await expect(
      caller(admin).reminder.updateStatus({ id: 5, status: "cancelled" })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateReminderSubscriptionStatus).toHaveBeenCalledWith(
      5,
      "cancelled"
    );
    const [entry] = mocks.createAdminAuditLog.mock.calls[0];
    expect(entry).toEqual({
      adminUserId: 9,
      action: "reminder.status.update",
      beforeValue: "active",
      afterValue: "cancelled",
      note: "문자 알림 5 · 010-****-5678 · 김소망 (kim-somang-kwonsa)",
    });
    expect(JSON.stringify(entry)).not.toContain("1234-5678");
  });

  it("없는 신청은 바꾸지도 기록하지도 않는다", async () => {
    mocks.getReminderSubscriptionById.mockResolvedValue(null);
    await expect(
      caller(admin).reminder.updateStatus({ id: 999, status: "cancelled" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.updateReminderSubscriptionStatus).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});

describe("auth.deleteAccount 감사기록", () => {
  it("탈퇴하면 회원번호와 가린 이메일만 남는다", async () => {
    await expect(
      caller(member).auth.deleteAccount({ password: "somang2026" })
    ).resolves.toEqual({ success: true });
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith({
      userId: 7,
      password: "somang2026",
    });
    const [entry] = mocks.createAdminAuditLog.mock.calls[0];
    expect(entry).toEqual({
      adminUserId: null,
      targetUserId: null,
      action: "user.delete",
      note: "회원 탈퇴 (회원번호 7, so***@example.org)",
    });
    expect(JSON.stringify(entry)).not.toContain("somang@example.org");
    expect(JSON.stringify(entry)).not.toContain("somang2026");
  });

  it("비밀번호가 틀리면 지우지도 기록하지도 않는다", async () => {
    mocks.deleteUserAccount.mockResolvedValue(false);
    await expect(
      caller(member).auth.deleteAccount({ password: "wrong" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});
