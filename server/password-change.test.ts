import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { credentialFingerprint } from "./_core/sessionCredential";

// 비밀번호 변경·다른 기기 모두 로그아웃 (2026-09-23): 지금 비밀번호를 확인하고,
// 저장값을 바꿔 다른 기기의 로그인을 끊고, 이 기기에는 새 로그인 쿠키를 준다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-password-change-tests-0123456";
  return { replaceUserPasswordAfterCheck: vi.fn() };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";
import { hashUserPassword } from "./db";

let address = 0;
function caller() {
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const call = appRouter.createCaller({
    user: {
      id: 7,
      role: "user",
      openId: "local:7",
      name: "가상인",
      email: "test@example.invalid",
      approvalStatus: "approved",
    },
    req: { headers: {}, socket: { remoteAddress: `10.8.0.${++address}` } },
    res,
  } as unknown as TrpcContext);
  return { call, res };
}

beforeEach(() => vi.clearAllMocks());

describe("비밀번호 변경", () => {
  it("지금 비밀번호가 틀리면 바꾸지 않는다", async () => {
    mocks.replaceUserPasswordAfterCheck.mockResolvedValue(null);
    const { call, res } = caller();
    await expect(
      call.auth.changePassword({
        currentPassword: "틀린비밀번호",
        newPassword: "새비밀번호2026",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("같은 비밀번호로는 바꾸지 않는다", async () => {
    const { call } = caller();
    await expect(
      call.auth.changePassword({
        currentPassword: "같은비밀번호1",
        newPassword: "같은비밀번호1",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.replaceUserPasswordAfterCheck).not.toHaveBeenCalled();
  });

  it("바꾸면 이 기기에 새 로그인 쿠키를 준다", async () => {
    mocks.replaceUserPasswordAfterCheck.mockResolvedValue(
      hashUserPassword("새비밀번호2026")
    );
    const { call, res } = caller();
    await call.auth.changePassword({
      currentPassword: "옛비밀번호2025",
      newPassword: "새비밀번호2026",
    });
    expect(mocks.replaceUserPasswordAfterCheck).toHaveBeenCalledWith({
      userId: 7,
      currentPassword: "옛비밀번호2025",
      nextPassword: "새비밀번호2026",
    });
    expect(res.cookie).toHaveBeenCalledTimes(1);
  });
});

describe("다른 기기 모두 로그아웃", () => {
  it("비밀번호는 그대로, 저장값만 새로 만들어 다른 기기의 로그인 지문이 달라진다", async () => {
    const before = hashUserPassword("그대로비밀번호");
    const after = hashUserPassword("그대로비밀번호");
    expect(credentialFingerprint(after)).not.toBe(
      credentialFingerprint(before)
    );

    mocks.replaceUserPasswordAfterCheck.mockResolvedValue(after);
    const { call, res } = caller();
    await call.auth.logoutOtherDevices({ password: "그대로비밀번호" });
    expect(mocks.replaceUserPasswordAfterCheck).toHaveBeenCalledWith({
      userId: 7,
      currentPassword: "그대로비밀번호",
      nextPassword: undefined,
    });
    expect(res.cookie).toHaveBeenCalledTimes(1);
  });
});
