import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 키오스크 문의 (2026-09-16): 전화번호를 표에 적고 업체 메일로 보낸다.
const mocks = vi.hoisted(() => ({
  createKioskInquiry: vi.fn(),
  markKioskInquiryNotified: vi.fn(),
  listKioskInquiries: vi.fn(),
  updateKioskInquiryStatus: vi.fn(),
  createAdminAuditLog: vi.fn(),
  sendKioskInquiryEmail: vi.fn(),
  getEmailConfigStatus: vi.fn(),
  env: { inquiryNotifyEmail: "" },
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});
vi.mock("./_core/email", () => ({
  sendKioskInquiryEmail: mocks.sendKioskInquiryEmail,
  getEmailConfigStatus: mocks.getEmailConfigStatus,
}));
vi.mock("./_core/env", async () => {
  const actual = await vi.importActual<{ ENV: Record<string, unknown> }>(
    "./_core/env"
  );
  return {
    ENV: new Proxy(actual.ENV, {
      get(target, key) {
        if (key === "inquiryNotifyEmail") return mocks.env.inquiryNotifyEmail;
        return target[key as string];
      },
    }),
  };
});

import { appRouter } from "./routers";

const admin = { id: 9, role: "admin", approvalStatus: "approved" };
let ipCounter = 0;
const context = (user: typeof admin | null): TrpcContext =>
  ({
    user,
    // 접수 횟수 제한은 접속지별이라 테스트마다 다른 주소를 쓴다.
    req: { ip: `10.0.0.${++ipCounter}`, headers: {}, socket: {} },
    res: {},
  }) as unknown as TrpcContext;
const caller = (user: typeof admin | null) =>
  appRouter.createCaller(context(user));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createKioskInquiry.mockResolvedValue(77);
  mocks.getEmailConfigStatus.mockReturnValue({ enabled: true });
  mocks.env.inquiryNotifyEmail = "office@example.org";
});

describe("kioskInquiry.submit", () => {
  it("번호를 정리해 저장하고 업체 메일로 보낸 뒤 가린 번호로 기록한다", async () => {
    await expect(
      caller(null).kioskInquiry.submit({
        phone: "010 1234 5678",
        name: "김소망",
      })
    ).resolves.toEqual({ success: true, notified: true });

    expect(mocks.createKioskInquiry).toHaveBeenCalledWith({
      phone: "010-1234-5678",
      name: "김소망",
      source: "kiosk",
    });
    expect(mocks.sendKioskInquiryEmail).toHaveBeenCalledWith({
      to: "office@example.org",
      phone: "010-1234-5678",
      name: "김소망",
      inquiryId: 77,
      source: "kiosk",
    });
    expect(mocks.markKioskInquiryNotified).toHaveBeenCalledWith(77, null);
    const audit = mocks.createAdminAuditLog.mock.calls[0][0];
    expect(audit.action).toBe("kiosk_inquiry.create");
    expect(audit.note).toContain("키오스크 문의 77");
    expect(audit.note).toContain("010-****-5678");
    expect(audit.note).not.toContain("1234-5678");
  });

  // 홈페이지 "문의하기" (2026-09-17): 같은 통로, 들어온 곳만 web.
  it("홈페이지에서 온 문의는 web 으로 적고 메일·기록에 홈페이지라고 남긴다", async () => {
    await expect(
      caller(null).kioskInquiry.submit({ phone: "02-123-4567", source: "web" })
    ).resolves.toEqual({ success: true, notified: true });

    expect(mocks.createKioskInquiry).toHaveBeenCalledWith({
      phone: "02-123-4567",
      name: null,
      source: "web",
    });
    expect(mocks.sendKioskInquiryEmail).toHaveBeenCalledWith(
      expect.objectContaining({ inquiryId: 77, source: "web" })
    );
    const audit = mocks.createAdminAuditLog.mock.calls[0][0];
    expect(audit.note).toContain("홈페이지 문의 77");
  });

  it("정해진 곳이 아니면 받지 않는다", async () => {
    await expect(
      caller(null).kioskInquiry.submit({
        phone: "01012345678",
        source: "elsewhere" as "web",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createKioskInquiry).not.toHaveBeenCalled();
  });

  it("메일 주소가 없으면 표에만 남기고 성공으로 답한다", async () => {
    mocks.env.inquiryNotifyEmail = "";
    await expect(
      caller(null).kioskInquiry.submit({ phone: "01012345678" })
    ).resolves.toEqual({ success: true, notified: false });
    expect(mocks.createKioskInquiry).toHaveBeenCalled();
    expect(mocks.sendKioskInquiryEmail).not.toHaveBeenCalled();
  });

  it("메일이 실패해도 접수는 남고 실패 사유를 적는다", async () => {
    mocks.sendKioskInquiryEmail.mockRejectedValue(new Error("SMTP down"));
    await expect(
      caller(null).kioskInquiry.submit({ phone: "01012345678" })
    ).resolves.toEqual({ success: true, notified: false });
    expect(mocks.markKioskInquiryNotified).toHaveBeenCalledWith(
      77,
      "SMTP down"
    );
  });

  it("전화번호가 아니면 저장하지 않는다", async () => {
    await expect(
      caller(null).kioskInquiry.submit({ phone: "1234" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createKioskInquiry).not.toHaveBeenCalled();
  });

  it("같은 곳에서 너무 자주 보내면 막는다", async () => {
    const same = appRouter.createCaller({
      user: null,
      req: { ip: "10.9.9.9", headers: {}, socket: {} },
      res: {},
    } as unknown as TrpcContext);
    // 몇 번은 받아 주다가(1회 이상, 5회 이하) 그 뒤로는 막아야 한다.
    let accepted = 0;
    let blocked: unknown = null;
    for (let i = 0; i < 8 && !blocked; i += 1) {
      try {
        await same.kioskInquiry.submit({ phone: "01012345678" });
        accepted += 1;
      } catch (error) {
        blocked = error;
      }
    }
    expect(accepted).toBeGreaterThanOrEqual(1);
    expect(accepted).toBeLessThanOrEqual(5);
    expect(blocked).toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("kioskInquiry admin", () => {
  it("목록은 관리자만", async () => {
    mocks.listKioskInquiries.mockResolvedValue([]);
    await expect(caller(null).kioskInquiry.adminList()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller(admin).kioskInquiry.adminList()).resolves.toEqual([]);
  });

  it("처리 상태를 바꾸면 가린 번호로 기록한다", async () => {
    mocks.updateKioskInquiryStatus.mockResolvedValue({
      before: "new",
      phone: "010-1234-5678",
    });
    await expect(
      caller(admin).kioskInquiry.updateStatus({ id: 77, status: "contacted" })
    ).resolves.toEqual({ success: true });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: 9,
      action: "kiosk_inquiry.status.update",
      beforeValue: "new",
      afterValue: "contacted",
      note: "키오스크 문의 77 · 010-****-5678",
    });
  });
});
