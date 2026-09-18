import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { CONSENT_VERSION } from "../shared/consent";

// 가입 동의 (2026-09-19): 필수 동의 세 가지가 없으면 서버가 가입을 받지 않는다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-signup-consent-tests-0123456";
  return { createLocalUser: vi.fn() };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, createLocalUser: mocks.createLocalUser };
});

import { appRouter } from "./routers";

let address = 0;
const signup = (input: unknown) =>
  appRouter
    .createCaller({
      user: null,
      req: { headers: {}, socket: { remoteAddress: `10.8.0.${++address}` } },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
    } as unknown as TrpcContext)
    .auth.signup(input as never);

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return (error as { code?: string }).code ?? "UNKNOWN";
  }
};

const base = {
  name: "김유족",
  email: "family@example.org",
  password: "long-enough-password",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createLocalUser.mockResolvedValue(null); // 가입 뒤 단계는 보지 않는다
});

describe("가입 필수 동의", () => {
  it("동의가 없으면 가입을 받지 않는다", async () => {
    expect(await codeOf(signup(base))).toBe("BAD_REQUEST");
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("만 14세 이상 확인이 빠지면 가입을 받지 않는다", async () => {
    const result = signup({
      ...base,
      consents: { privacy: true, terms: true, over14: false },
    });
    expect(await codeOf(result)).toBe("BAD_REQUEST");
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("세 가지 모두 동의하면 가입 단계로 넘어간다", async () => {
    await codeOf(
      signup({ ...base, consents: { privacy: true, terms: true, over14: true } })
    );
    expect(mocks.createLocalUser).toHaveBeenCalledTimes(1);
  });

  it("동의 판(版)은 날짜 형식이다", () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
