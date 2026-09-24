import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 비공개 추모관·가족관 비밀번호 (2026-09-18): 접속지를 바꿔 가며 한 곳을
// 두드리는 것을 막는다. 추모 알림 신청은 스위치가 꺼져 있으면 서버도 받지 않는다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-room-lockout-tests-0123456789";
  return {
    verifyMemorialAccessPassword: vi.fn(),
    verifyMemorialFamilyRoomPassword: vi.fn(),
    findMemorialIdBySlug: vi.fn(),
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
  mocks.findMemorialIdBySlug.mockResolvedValue(null);
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

// 비밀번호 시도 횟수는 추모관 하나(번호)를 기준으로 센다 (2026-09-25).
describe("비밀번호 시도 횟수는 추모관 하나를 기준으로 센다", () => {
  // 보이지 않는 글자(폭 0 공백 등). 파일에 그대로 넣지 않으려고 번호로 만든다.
  const ZWSP = String.fromCharCode(0x200b);
  const BOM = String.fromCharCode(0xfeff);
  const INVISIBLE = new RegExp(
    `[${ZWSP}-${String.fromCharCode(0x200d)}${BOM}]`,
    "g"
  );
  // 가짜 DB: 주소로 추모관 번호를 찾는다.
  const memorialIds: Record<string, number> = {
    "room-c1": 41,
    "room-c2": 42,
    "room-c3": 43,
    "room-c4": 44,
    "room-c5": 45,
    "other-room": 46,
  };
  const sameMemorial = (slug: string) =>
    memorialIds[slug.replace(INVISIBLE, "").toLowerCase()] ?? null;

  beforeEach(() => {
    mocks.findMemorialIdBySlug.mockImplementation(async (slug: string) =>
      sameMemorial(slug)
    );
  });

  it("추모관 입장: 모양을 바꿔도 같은 추모관이면 20번에서 막힌다", async () => {
    const tryFrom = (address: string, slug: string) =>
      appRouter
        .createCaller(context(address))
        .memorial.verifyAccess({ slug, password: "0000" });

    for (let i = 0; i < 20; i += 1) {
      expect(await codeOf(tryFrom(`10.6.0.${i + 1}`, "room-c1"))).toBe(
        "UNAUTHORIZED"
      );
    }
    for (const variant of ["ROOM-c1", "Room-C1", "room-c1" + ZWSP]) {
      expect(await codeOf(tryFrom("10.6.1.1", variant)), variant).toBe(
        "TOO_MANY_REQUESTS"
      );
    }
    expect(mocks.verifyMemorialAccessPassword).toHaveBeenCalledTimes(20);
  });

  it("추모관 입장: 한 곳에서 5번 틀린 뒤 모양만 바꿔도 막힌다", async () => {
    const tryAs = (slug: string) =>
      appRouter
        .createCaller(context("10.6.2.1"))
        .memorial.verifyAccess({ slug, password: "0000" });
    for (let i = 0; i < 5; i += 1) {
      expect(await codeOf(tryAs("room-c2"))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(tryAs("ROOM-C2"))).toBe("TOO_MANY_REQUESTS");
  });

  it("가족관: 모양을 바꿔도 같은 추모관이면 20번에서 막힌다", async () => {
    const tryFrom = (address: string, memorialSlug: string) =>
      appRouter
        .createCaller(context(address))
        .familyRoom.verify({ memorialSlug, password: "0000" });

    for (let i = 0; i < 20; i += 1) {
      expect(await codeOf(tryFrom(`10.7.0.${i + 1}`, "room-c3"))).toBe(
        "UNAUTHORIZED"
      );
    }
    for (const variant of ["ROOM-c3", "room-C3" + BOM]) {
      expect(await codeOf(tryFrom("10.7.1.1", variant)), variant).toBe(
        "TOO_MANY_REQUESTS"
      );
    }
    expect(mocks.verifyMemorialFamilyRoomPassword).toHaveBeenCalledTimes(20);
  });

  it("가족관: 한 곳에서 5번 틀린 뒤 모양만 바꿔도 막힌다", async () => {
    const tryAs = (memorialSlug: string) =>
      appRouter
        .createCaller(context("10.7.2.1"))
        .familyRoom.verify({ memorialSlug, password: "0000" });
    for (let i = 0; i < 5; i += 1) {
      expect(await codeOf(tryAs("room-c4"))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(tryAs("Room-C4"))).toBe("TOO_MANY_REQUESTS");
  });

  it("없는 주소도 모양만 바꿔서는 새로 세지 않는다", async () => {
    const tryAs = (slug: string) =>
      appRouter
        .createCaller(context("10.6.3.1"))
        .memorial.verifyAccess({ slug, password: "0000" });
    mocks.verifyMemorialAccessPassword.mockResolvedValue(null);
    for (let i = 0; i < 5; i += 1) {
      expect(await codeOf(tryAs("no-such-room"))).toBe("NOT_FOUND");
    }
    expect(await codeOf(tryAs("NO-SUCH-ROOM" + ZWSP))).toBe(
      "TOO_MANY_REQUESTS"
    );
  });

  it("다른 추모관은 영향을 받지 않고, 맞는 비밀번호는 그대로 들어간다", async () => {
    const caller = appRouter.createCaller(context("10.6.4.1"));
    for (let i = 0; i < 5; i += 1) {
      await codeOf(
        caller.memorial.verifyAccess({ slug: "room-c5", password: "0000" })
      );
    }
    mocks.verifyMemorialAccessPassword.mockResolvedValue({
      slug: "other-room",
      name: "시험",
      href: "/memorial/other-room",
      accessToken: "token",
    });
    expect(
      await codeOf(
        caller.memorial.verifyAccess({ slug: "other-room", password: "123456" })
      )
    ).toBe("OK");
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
