import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";

// sdk 는 불러올 때 JWT_SECRET 을 읽는다. 시험용 값을 먼저 넣는다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET =
    "test-secret-for-session-credential-tests-0123456789";
  return {
    getUserByOpenId: vi.fn(),
    upsertUser: vi.fn(),
    isSessionRevoked: vi.fn().mockResolvedValue(false),
    revokeSession: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { COOKIE_NAME } from "@shared/const";
import { credentialFingerprint } from "./_core/sessionCredential";
import { sdk } from "./_core/sdk";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const oldHash = "scrypt$old-salt$old-hash";
const newHash = "scrypt$new-salt$new-hash";
const baseUser = {
  id: 7,
  openId: "local:somang",
  name: "김소망",
  email: "somang@example.org",
  role: "user",
  approvalStatus: "approved",
  passwordHash: oldHash,
};

const requestWith = (token: string) =>
  ({ headers: { cookie: `${COOKIE_NAME}=${token}` } }) as unknown as Request;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserByOpenId.mockResolvedValue(baseUser);
  mocks.upsertUser.mockResolvedValue(undefined);
});

describe("credentialFingerprint", () => {
  it("비밀번호 해시가 바뀌면 지문도 바뀐다", () => {
    expect(credentialFingerprint(oldHash)).not.toBe(
      credentialFingerprint(newHash)
    );
    expect(credentialFingerprint(oldHash)).toBe(credentialFingerprint(oldHash));
  });

  it("지문에서 해시를 알아볼 수 없고 짧다", () => {
    const fp = credentialFingerprint(oldHash);
    expect(fp).toHaveLength(16);
    expect(fp).not.toContain("old");
  });

  it("비밀번호가 없는 계정(외부 로그인)도 같은 값이 나온다", () => {
    expect(credentialFingerprint(null)).toBe(credentialFingerprint(undefined));
  });
});

describe("비밀번호를 바꾸면 옛 로그인이 끊긴다", () => {
  it("지문이 맞는 세션은 통과한다", async () => {
    const token = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: credentialFingerprint(oldHash),
    });
    const user = await sdk.authenticateRequest(requestWith(token));
    expect(user.id).toBe(7);
  });

  it("비밀번호 재설정 뒤에는 옛 세션이 거부된다", async () => {
    const token = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: credentialFingerprint(oldHash),
    });
    mocks.getUserByOpenId.mockResolvedValue({
      ...baseUser,
      passwordHash: newHash,
    });
    await expect(sdk.authenticateRequest(requestWith(token))).rejects.toThrow(
      /credential/
    );
    // 거부된 요청은 마지막 로그인 시각도 갱신하지 않는다.
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("지문이 없는 옛 형식 세션은 거부된다 (한 번만 다시 로그인)", async () => {
    const token = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
    });
    await expect(sdk.authenticateRequest(requestWith(token))).rejects.toThrow(
      /credential/
    );
  });

  it("연장용 읽기에도 지문이 함께 나온다", async () => {
    const fp = credentialFingerprint(oldHash);
    const token = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: fp,
    });
    const session = await sdk.readSession(requestWith(token));
    expect(session?.cred).toBe(fp);
  });
});

describe("로그아웃 후 서버 폐기", () => {
  it("같은 쿠키와 연장 전 쿠키를 다시 쓰지 못한다", async () => {
    const revoked = new Set<string>();
    mocks.revokeSession.mockImplementation(async (key: string) => {
      revoked.add(key);
    });
    mocks.isSessionRevoked.mockImplementation(async (key: string) =>
      revoked.has(key)
    );
    const token = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: credentialFingerprint(oldHash),
    });
    const session = await sdk.readSession(requestWith(token));
    const renewed = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: session!.cred,
      sessionId: session!.sid,
    });
    const ctx = {
      user: baseUser,
      req: requestWith(renewed),
      res: { clearCookie: vi.fn() },
    } as unknown as TrpcContext;
    await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
      success: true,
    });
    expect(mocks.revokeSession).toHaveBeenCalledOnce();
    await expect(sdk.authenticateRequest(requestWith(renewed))).rejects.toThrow(
      /Revoked/
    );
    await expect(sdk.authenticateRequest(requestWith(token))).rejects.toThrow(
      /Revoked/
    );
  });

  it("배포 전 쿠키가 연장된 뒤에도 원본과 연장본을 함께 막는다", async () => {
    const revoked = new Set<string>();
    mocks.revokeSession.mockImplementation(async (key: string) => {
      revoked.add(key);
    });
    mocks.isSessionRevoked.mockImplementation(async (key: string) =>
      revoked.has(key)
    );
    const oldToken = await sdk.signSession({
      openId: baseUser.openId,
      appId: "somang-memorial",
      name: baseUser.name,
      cred: credentialFingerprint(oldHash),
    });
    const oldSession = await sdk.readSession(requestWith(oldToken));
    const renewed = await sdk.createSessionToken(baseUser.openId, {
      name: baseUser.name,
      credential: oldSession!.cred,
      sessionId: oldSession!.sid,
    });
    await sdk.revokeRequestSession(requestWith(renewed));
    await expect(
      sdk.authenticateRequest(requestWith(oldToken))
    ).rejects.toThrow(/Revoked/);
    await expect(sdk.authenticateRequest(requestWith(renewed))).rejects.toThrow(
      /Revoked/
    );
  });
});
