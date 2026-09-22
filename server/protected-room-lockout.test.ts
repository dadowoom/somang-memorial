import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 비공개 추모관·가족관 비밀번호 (2026-09-18): 접속지를 바꿔 가며 한 곳을
// 두드리는 것을 막는다. 추모 알림 신청은 스위치가 꺼져 있으면 서버도 받지 않는다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-room-lockout-tests-0123456789";
  return {
    verifyMemorialAccessPassword: vi.fn(),
    verifyMemorialFamilyRoomPassword: vi.fn(),
    createMemorialReminderSubscription: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const context = (address: string): TrpcContext =>
  ({
    user: null,
    req: { headers: {}, socket: { remoteAddress: address } },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  }) as unknown as TrpcContext;

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return (error as { code?: string }).code ?? "UNKNOWN";
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyMemorialAccessPassword.mockResolvedValue(false);
  mocks.verifyMemorialFamilyRoomPassword.mockResolvedValue(false);
});

describe("비공개 추모관 입장 비밀번호", () => {
  it("접속지를 바꿔 가며 두드려도 20번 틀리면 그 추모관은 막힌다", async () => {
    const tryFrom = (address: string) =>
      appRouter
        .createCaller(context(address))
        .memorial.verifyAccess({ slug: "private-room-a", password: "0000" });

    for (let i = 0; i < 20; i += 1) {
      expect(await codeOf(tryFrom(`10.3.0.${i + 1}`))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(tryFrom("10.3.1.1"))).toBe("TOO_MANY_REQUESTS");
    expect(mocks.verifyMemorialAccessPassword).toHaveBeenCalledTimes(20);
  });
});

describe("가족관 비밀번호", () => {
  it("접속지를 바꿔 가며 두드려도 20번 틀리면 그 가족관은 막힌다", async () => {
    const tryFrom = (address: string) =>
      appRouter
        .createCaller(context(address))
        .familyRoom.verify({ memorialSlug: "family-room-a", password: "0000" });

    for (let i = 0; i < 20; i += 1) {
      expect(await codeOf(tryFrom(`10.4.0.${i + 1}`))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(tryFrom("10.4.1.1"))).toBe("TOO_MANY_REQUESTS");
    // 다른 가족관은 영향을 받지 않는다.
    const other = appRouter
      .createCaller(context("10.4.1.1"))
      .familyRoom.verify({ memorialSlug: "family-room-b", password: "0000" });
    expect(await codeOf(other)).toBe("UNAUTHORIZED");
  });
});

describe("추도일 알림 신청", () => {
  it("신청 스위치가 꺼져 있으면 서버도 받지 않고 문자도 보내지 않는다", async () => {
    const result = appRouter.createCaller(context("10.5.0.1")).reminder.subscribe({
      memorialSlug: "any-memorial",
      phone: "010-1234-5678",
      code: "123456",
      consent: true,
    });
    expect(await codeOf(result)).toBe("FORBIDDEN");
    expect(mocks.createMemorialReminderSubscription).not.toHaveBeenCalled();
  });

  it("신청 스위치가 꺼져 있으면 인증번호도 보내지 않는다", async () => {
    const result = appRouter
      .createCaller(context("10.5.0.2"))
      .reminder.requestCode({
        memorialSlug: "any-memorial",
        phone: "010-1234-5678",
      });
    expect(await codeOf(result)).toBe("FORBIDDEN");
  });

  it("알림 그만 받기는 신청 스위치가 꺼져 있어도 막지 않는다", async () => {
    const result = appRouter
      .createCaller(context("10.5.0.4"))
      .reminder.requestCode({
        memorialSlug: "any-memorial",
        phone: "010-1234-5678",
        purpose: "cancel",
      });
    expect(await codeOf(result)).not.toBe("FORBIDDEN");
  });

  it("인증번호 없이는 알림을 끌 수 없다", async () => {
    const result = appRouter.createCaller(context("10.5.0.5")).reminder.cancel({
      memorialSlug: "any-memorial",
      phone: "010-1234-5678",
    } as never);
    expect(await codeOf(result)).toBe("BAD_REQUEST");
  });

  it("인증번호 없이는 신청할 수 없다", async () => {
    const result = appRouter.createCaller(context("10.5.0.3")).reminder.subscribe({
      memorialSlug: "any-memorial",
      phone: "010-1234-5678",
      consent: true,
    } as never);
    expect(await codeOf(result)).toBe("BAD_REQUEST");
  });
});
