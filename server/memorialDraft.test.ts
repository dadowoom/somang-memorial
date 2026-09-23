import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 추모관 작성 중 자동 저장 (2026-09-23). DB 는 가짜로 대신한다.
const mocks = vi.hoisted(() => ({
  getMemorialWritingDraft: vi.fn(),
  saveMemorialWritingDraft: vi.fn(),
  deleteMemorialWritingDraft: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";
import { sanitizeDraftPayload } from "./memorialDraft";

const member = { id: 7, role: "user", approvalStatus: "approved" };
const caller = (user: typeof member | null) =>
  appRouter.createCaller({
    user,
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as TrpcContext);

const draft = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 2,
    userId: 7,
    form: { name: "김소망", story: "기도하신 분", accessPassword: "1234" },
    timeline: [],
    step: 1,
    savedAt: 1,
    ...overrides,
  });

beforeEach(() => vi.clearAllMocks());

describe("저장본 검사", () => {
  it("입장 비밀번호와 관리자 메모는 빼고 저장한다", () => {
    const clean = sanitizeDraftPayload(
      draft({
        form: { name: "김소망", accessPassword: "1234", managerMemo: "메모" },
      }),
      7
    );
    expect(JSON.parse(clean as string).form).toEqual({ name: "김소망" });
  });

  it("남의 회원번호·옛 형식·깨진 글은 받지 않는다", () => {
    expect(sanitizeDraftPayload(draft({ userId: 8 }), 7)).toBeNull();
    expect(sanitizeDraftPayload(draft({ version: 1 }), 7)).toBeNull();
    expect(sanitizeDraftPayload(draft({ timeline: "x" }), 7)).toBeNull();
    expect(sanitizeDraftPayload("{깨짐", 7)).toBeNull();
    expect(sanitizeDraftPayload("[]", 7)).toBeNull();
  });
});

describe("memorialDraft 경로", () => {
  it("로그인하지 않으면 읽지도 쓰지도 못한다", async () => {
    await expect(caller(null).memorialDraft.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller(null).memorialDraft.save({ payload: draft() })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.saveMemorialWritingDraft).not.toHaveBeenCalled();
  });

  it("본인 저장본만 읽는다", async () => {
    mocks.getMemorialWritingDraft.mockResolvedValue({
      payload: draft(),
      updatedAt: new Date(1_790_000_000_000),
    });
    await expect(caller(member).memorialDraft.get()).resolves.toEqual({
      payload: draft(),
      updatedAt: 1_790_000_000_000,
    });
    expect(mocks.getMemorialWritingDraft).toHaveBeenCalledWith(7);
  });

  it("저장본이 없으면 null", async () => {
    mocks.getMemorialWritingDraft.mockResolvedValue(null);
    await expect(caller(member).memorialDraft.get()).resolves.toBeNull();
  });

  it("비밀번호를 뺀 저장본을 이 계정에 저장한다", async () => {
    await caller(member).memorialDraft.save({ payload: draft() });
    const [userId, payload] = mocks.saveMemorialWritingDraft.mock.calls[0];
    expect(userId).toBe(7);
    expect(payload).not.toContain("1234");
  });

  it("다른 회원번호가 적힌 저장본은 거절한다", async () => {
    await expect(
      caller(member).memorialDraft.save({ payload: draft({ userId: 8 }) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.saveMemorialWritingDraft).not.toHaveBeenCalled();
  });

  it("지우기는 본인 저장본만 지운다", async () => {
    await caller(member).memorialDraft.clear();
    expect(mocks.deleteMemorialWritingDraft).toHaveBeenCalledWith(7);
  });
});
