import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 로그인 시도 제한 (2026-09-14): 같은 곳+같은 계정 5회 외에, 계정 기준 15회와
// 접속지 기준 30회를 따로 센다. 실제 비밀번호 비교는 하지 않고 항상 틀리게 한다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-login-lockout-tests-0123456789";
  return {
    getUserByLocalLogin: vi.fn(),
    verifyUserPassword: vi.fn(),
    upsertUser: vi.fn(),
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

const attempt = (identifier: string, address: string) =>
  appRouter
    .createCaller(context(address))
    .auth.login({ identifier, password: "wrong-password" });

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
  mocks.getUserByLocalLogin.mockResolvedValue({
    id: 7,
    openId: "local:target",
    name: "김소망",
    approvalStatus: "approved",
    passwordHash: "scrypt$salt$hash",
  });
  mocks.verifyUserPassword.mockReturnValue(false);
});

describe("auth.login 시도 제한", () => {
  it("같은 곳에서 같은 계정을 5번 틀리면 6번째부터 막힌다", async () => {
    const id = "same-place@example.org";
    for (let i = 0; i < 5; i += 1) {
      expect(await codeOf(attempt(id, "10.0.0.1"))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(attempt(id, "10.0.0.1"))).toBe("TOO_MANY_REQUESTS");
    // 막힌 뒤에는 비밀번호 비교 자체를 하지 않는다.
    expect(mocks.verifyUserPassword).toHaveBeenCalledTimes(5);
  });

  it("접속지를 바꿔 가며 한 계정을 두드려도 15번째 뒤에는 막힌다", async () => {
    const id = "many-places@example.org";
    for (let i = 0; i < 15; i += 1) {
      expect(await codeOf(attempt(id, `10.1.0.${i + 1}`))).toBe("UNAUTHORIZED");
    }
    expect(await codeOf(attempt(id, "10.1.0.99"))).toBe("TOO_MANY_REQUESTS");
  });

  it("한 곳에서 계정을 바꿔 가며 두드려도 30번째 뒤에는 막힌다", async () => {
    for (let i = 0; i < 30; i += 1) {
      expect(await codeOf(attempt(`victim-${i}@example.org`, "10.2.0.1"))).toBe(
        "UNAUTHORIZED"
      );
    }
    expect(await codeOf(attempt("victim-new@example.org", "10.2.0.1"))).toBe(
      "TOO_MANY_REQUESTS"
    );
    // 다른 곳에서 오는 정상 시도는 영향을 받지 않는다.
    expect(await codeOf(attempt("victim-new@example.org", "10.2.0.2"))).toBe(
      "UNAUTHORIZED"
    );
  });
});
