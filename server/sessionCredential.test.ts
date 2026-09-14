import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";

// sdk 는 불러올 때 JWT_SECRET 을 읽는다. 시험용 값을 먼저 넣는다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET =
    "test-secret-for-session-credential-tests-0123456789";
  return {
    getUserByOpenId: vi.fn(),
    upsertUser: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { COOKIE_NAME } from "@shared/const";
import { credentialFingerprint } from "./_core/sessionCredential";
import { sdk } from "./_core/sdk";

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
