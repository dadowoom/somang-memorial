import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getPublicMemorialBySlug: vi.fn(),
  isMemorialFamilyMember: vi.fn(),
  updateMemorial: vi.fn(),
  createAdminAuditLog: vi.fn(),
  listMemorialLetters: vi.fn(),
  createMemorialLetter: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const family = { ...owner, id: 11 };
const other = { ...owner, id: 8 };
const admin = { ...owner, id: 9, role: "admin" };

let requestCount = 0;
const context = (user: typeof owner | null): TrpcContext => {
  // 편지 남기기는 접속지마다 횟수 제한이 있어, 시험마다 다른 접속지로 부른다.
  requestCount += 1;
  return {
    user,
    req: { headers: {}, socket: { remoteAddress: `10.0.0.${requestCount}` } },
    res: {},
  } as unknown as TrpcContext;
};
const caller = (user: typeof owner | null) =>
  appRouter.createCaller(context(user));

const draft = {
  id: 42,
  slug: "kim-somang",
  name: "김소망",
  visibility: "public",
  status: "pending",
  accessPasswordHash: null,
  createdByUserId: 7,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getPublicMemorialBySlug.mockResolvedValue(draft);
  mocks.isMemorialFamilyMember.mockResolvedValue(false);
  mocks.listMemorialLetters.mockResolvedValue([]);
});

// 2026-09-16 결정: 추모관은 "작성 중"으로 시작하고, 가족이 "등록 완료"를 눌러야
// 다른 분들이 보고 편지를 남길 수 있다.
describe("memorial.completeRegistration", () => {
  it("추모관을 만든 가족이 누르면 등록을 마치고 기록을 남긴다", async () => {
    await expect(
      caller(owner).memorial.completeRegistration({ slug: "kim-somang" })
    ).resolves.toEqual({
      success: true,
      status: "published",
      alreadyComplete: false,
    });
    expect(mocks.updateMemorial).toHaveBeenCalledWith(42, {
      status: "published",
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith({
      adminUserId: null,
      targetUserId: 7,
      action: "memorial.registration.complete",
      beforeValue: "pending",
      afterValue: "published",
      note: "김소망 (kim-somang)",
    });
  });

  it("초대받은 가족과 관리자도 마칠 수 있다", async () => {
    mocks.isMemorialFamilyMember.mockResolvedValue(true);
    await expect(
      caller(family).memorial.completeRegistration({ slug: "kim-somang" })
    ).resolves.toMatchObject({ status: "published" });
    await expect(
      caller(admin).memorial.completeRegistration({ slug: "kim-somang" })
    ).resolves.toMatchObject({ status: "published" });
  });

  it("남의 추모관은 마칠 수 없다", async () => {
    await expect(
      caller(other).memorial.completeRegistration({ slug: "kim-somang" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateMemorial).not.toHaveBeenCalled();
  });

  it("로그인하지 않았으면 마칠 수 없다", async () => {
    await expect(
      caller(null).memorial.completeRegistration({ slug: "kim-somang" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("이미 마친 추모관은 그대로 두고 알린다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValue({
      ...draft,
      status: "published",
    });
    await expect(
      caller(owner).memorial.completeRegistration({ slug: "kim-somang" })
    ).resolves.toMatchObject({ alreadyComplete: true });
    expect(mocks.updateMemorial).not.toHaveBeenCalled();
  });

  it("관리자가 비공개로 돌려 둔 추모관은 가족이 다시 열 수 없다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValue({
      ...draft,
      status: "private",
    });
    await expect(
      caller(owner).memorial.completeRegistration({ slug: "kim-somang" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateMemorial).not.toHaveBeenCalled();
  });

  it("비공개인데 입장 비밀번호가 없으면 먼저 정하라고 알린다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValue({
      ...draft,
      visibility: "private",
      accessPasswordHash: null,
    });
    await expect(
      caller(owner).memorial.completeRegistration({ slug: "kim-somang" })
    ).rejects.toThrow(/입장 비밀번호를 먼저/);
    expect(mocks.updateMemorial).not.toHaveBeenCalled();
  });
});

describe("작성 중인 추모관의 편지", () => {
  it("만든 가족이 보더라도 편지 목록은 비어 있다", async () => {
    mocks.listMemorialLetters.mockResolvedValue([{ id: 1 }]);
    await expect(
      caller(owner).letter.byMemorial({ memorialSlug: "kim-somang" })
    ).resolves.toEqual([]);
    expect(mocks.listMemorialLetters).not.toHaveBeenCalled();
  });

  it("편지를 남길 수 없다", async () => {
    await expect(
      caller(owner).letter.create({
        memorialSlug: "kim-somang",
        author: "손녀",
        content: "보고 싶어요",
      })
    ).rejects.toThrow(/등록이 끝난 뒤에/);
    expect(mocks.createMemorialLetter).not.toHaveBeenCalled();
  });

  it("방문자는 작성 중인 추모관 편지를 볼 수 없다", async () => {
    await expect(
      caller(null).letter.byMemorial({ memorialSlug: "kim-somang" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("등록을 마친 추모관에는 편지를 남긴다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValue({
      ...draft,
      status: "published",
    });
    mocks.createMemorialLetter.mockResolvedValue({
      id: 5,
      memorialSlug: "kim-somang",
      author: "손녀",
      content: "보고 싶어요",
    });
    await expect(
      caller(null).letter.create({
        memorialSlug: "kim-somang",
        author: "손녀",
        content: "보고 싶어요",
      })
    ).resolves.toMatchObject({ id: 5 });
  });
});
