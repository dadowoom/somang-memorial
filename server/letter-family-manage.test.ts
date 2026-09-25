import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 가족이 편지를 보고 숨기기 (2026-09-23). DB 는 가짜로 대신한다.
const mocks = vi.hoisted(() => ({
  getPublicMemorialBySlug: vi.fn(),
  isMemorialFamilyMember: vi.fn(),
  listMemorialLettersForFamily: vi.fn(),
  setMemorialLetterStatusForMemorial: vi.fn(),
  createAdminAuditLog: vi.fn(),
  listChurchHiddenLetterIds: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const stranger = { ...owner, id: 8 };
const family = { ...owner, id: 9 };
const admin = { ...owner, id: 1, role: "admin" };
const caller = (user: typeof owner | null) =>
  appRouter.createCaller({
    user,
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as TrpcContext);

const memorial = {
  id: 5,
  slug: "kim-somang",
  name: "김소망",
  role: "권사",
  status: "published",
  visibility: "public",
  createdByUserId: 7,
};
const letters = [
  {
    id: 31,
    author: "둘째 딸",
    content: "보고 싶어요",
    status: "published",
    createdAt: new Date(),
  },
  {
    id: 32,
    author: "익명",
    content: "광고",
    status: "hidden",
    createdAt: new Date(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublicMemorialBySlug.mockResolvedValue(memorial);
  mocks.isMemorialFamilyMember.mockImplementation(
    async (_memorialId: number, userId: number) => userId === family.id
  );
  mocks.listMemorialLettersForFamily.mockResolvedValue(letters);
  mocks.setMemorialLetterStatusForMemorial.mockResolvedValue({
    author: "익명",
    status: "published",
  });
  mocks.listChurchHiddenLetterIds.mockResolvedValue(new Set());
});

describe("letter.familyList", () => {
  it("추모관을 만든 가족·초대받은 가족·관리자는 숨긴 편지까지 본다", async () => {
    for (const user of [owner, family, admin]) {
      const result = await caller(user).letter.familyList({
        memorialSlug: "kim-somang",
      });
      expect(result.letters).toHaveLength(2);
      expect(result.memorialName).toBe("김소망 권사");
    }
    expect(mocks.listMemorialLettersForFamily).toHaveBeenCalledWith(5);
  });

  it("다른 회원과 로그인하지 않은 방문자는 볼 수 없다", async () => {
    await expect(
      caller(stranger).letter.familyList({ memorialSlug: "kim-somang" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(null).letter.familyList({ memorialSlug: "kim-somang" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.listMemorialLettersForFamily).not.toHaveBeenCalled();
  });

  it("없는 추모관은 없다고 답한다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValue(null);
    await expect(
      caller(owner).letter.familyList({ memorialSlug: "nobody" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("letter.familyUpdateStatus", () => {
  const hide = {
    memorialSlug: "kim-somang",
    letterId: 32,
    status: "hidden" as const,
  };

  it("가족이 숨기면 이 추모관의 편지만 바꾸고 기록을 남긴다", async () => {
    await expect(
      caller(family).letter.familyUpdateStatus(hide)
    ).resolves.toEqual({
      success: true,
    });
    expect(mocks.setMemorialLetterStatusForMemorial).toHaveBeenCalledWith({
      letterId: 32,
      memorialId: 5,
      status: "hidden",
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: null,
        targetUserId: 9,
        action: "letter.status.update",
        beforeValue: "published",
        afterValue: "hidden",
      })
    );
  });

  it("다른 추모관의 편지 번호면 아무것도 바뀌지 않는다", async () => {
    mocks.setMemorialLetterStatusForMemorial.mockResolvedValue(null);
    await expect(
      caller(owner).letter.familyUpdateStatus(hide)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("권한 없는 회원은 숨길 수 없다", async () => {
    await expect(
      caller(stranger).letter.familyUpdateStatus(hide)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.setMemorialLetterStatusForMemorial).not.toHaveBeenCalled();
  });

  it("이미 같은 상태면 기록을 또 남기지 않는다", async () => {
    mocks.setMemorialLetterStatusForMemorial.mockResolvedValue({
      author: "익명",
      status: "hidden",
    });
    await caller(owner).letter.familyUpdateStatus(hide);
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});

// 관리자(교회)가 숨긴 편지는 가족이 다시 보이게 할 수 없다 (2026-09-25).
describe("관리자가 숨긴 편지", () => {
  const restore = {
    memorialSlug: "kim-somang",
    letterId: 32,
    status: "published" as const,
  };

  beforeEach(() => {
    mocks.listChurchHiddenLetterIds.mockResolvedValue(new Set([32]));
    mocks.setMemorialLetterStatusForMemorial.mockResolvedValue({
      author: "익명",
      status: "hidden",
    });
  });

  it("주인·초대받은 가족은 다시 보이게 할 수 없다", async () => {
    for (const user of [owner, family]) {
      await expect(
        caller(user).letter.familyUpdateStatus(restore)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(mocks.setMemorialLetterStatusForMemorial).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
    expect(mocks.listChurchHiddenLetterIds).toHaveBeenCalledWith(5, [32]);
  });

  it("관리자는 다시 보이게 할 수 있다", async () => {
    await expect(
      caller(admin).letter.familyUpdateStatus(restore)
    ).resolves.toEqual({ success: true });
    expect(mocks.setMemorialLetterStatusForMemorial).toHaveBeenCalledWith({
      letterId: 32,
      memorialId: 5,
      status: "published",
    });
  });

  it("가족이 직접 숨긴 편지는 가족이 다시 보이게 할 수 있다", async () => {
    mocks.listChurchHiddenLetterIds.mockResolvedValue(new Set());
    await expect(
      caller(family).letter.familyUpdateStatus(restore)
    ).resolves.toEqual({ success: true });
    expect(mocks.setMemorialLetterStatusForMemorial).toHaveBeenCalled();
  });

  it("가족 화면에는 관리자가 숨긴 편지가 잠겨 있다고 알려 준다", async () => {
    const forFamily = await caller(family).letter.familyList({
      memorialSlug: "kim-somang",
    });
    expect(
      forFamily.letters.map(letter => [letter.id, letter.lockedByChurch])
    ).toEqual([
      [31, false],
      [32, true],
    ]);
    const forAdmin = await caller(admin).letter.familyList({
      memorialSlug: "kim-somang",
    });
    expect(forAdmin.letters.every(letter => !letter.lockedByChurch)).toBe(true);
  });
});
