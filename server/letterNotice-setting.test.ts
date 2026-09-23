import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 새 편지 알림 받기 설정 (2026-09-23). DB 는 가짜로 대신한다.
const mocks = vi.hoisted(() => ({
  getLetterNoticeOptOut: vi.fn(),
  setLetterNoticeOptOut: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const member = { id: 7, role: "user", approvalStatus: "approved" };
const caller = (user: typeof member | null) =>
  appRouter.createCaller({
    user,
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as TrpcContext);

beforeEach(() => vi.clearAllMocks());

describe("letterNotice 설정", () => {
  it("기본은 받는다 (끈 기록이 없으면 켜짐)", async () => {
    mocks.getLetterNoticeOptOut.mockResolvedValue(false);
    await expect(caller(member).letterNotice.get()).resolves.toEqual({
      enabled: true,
    });
    expect(mocks.getLetterNoticeOptOut).toHaveBeenCalledWith(7);
  });

  it("끄면 끈 기록을 남기고, 켜면 지운다 (본인 것만)", async () => {
    await caller(member).letterNotice.set({ enabled: false });
    expect(mocks.setLetterNoticeOptOut).toHaveBeenLastCalledWith(7, true);
    await caller(member).letterNotice.set({ enabled: true });
    expect(mocks.setLetterNoticeOptOut).toHaveBeenLastCalledWith(7, false);
  });

  it("로그인하지 않으면 바꿀 수 없다", async () => {
    await expect(
      caller(null).letterNotice.set({ enabled: false })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.setLetterNoticeOptOut).not.toHaveBeenCalled();
  });
});
