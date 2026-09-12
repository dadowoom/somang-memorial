import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  canInviteMemorialFamily,
  canManageMemorialAsFamily,
  memorialFamilyRole,
} from "../shared/memorialFamilyPermissions";

const mocks = vi.hoisted(() => ({
  getAdminMemorialBySlug: vi.fn(),
  getAdminMemorialById: vi.fn(),
  updateMemorial: vi.fn(),
  createAdminAuditLog: vi.fn(),
  isMemorialFamilyMember: vi.fn(),
  listMemorialFamilyMembers: vi.fn(),
  getActiveMemorialFamilyInvitation: vi.fn(),
  createMemorialFamilyInvitation: vi.fn(),
  revokeMemorialFamilyInvitations: vi.fn(),
  removeMemorialFamilyMember: vi.fn(),
  getMemorialFamilyInvitationByToken: vi.fn(),
  addMemorialFamilyMember: vi.fn(),
  getMemorialFamilyRoomManageInfo: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const member = { ...owner, id: 8 };
const other = { ...owner, id: 9 };
const admin = { ...owner, id: 10, role: "admin" };

const context = (user: typeof owner | null): TrpcContext =>
  ({ user, req: {}, res: {} }) as unknown as TrpcContext;
const caller = (user: typeof owner | null) =>
  appRouter.createCaller(context(user));

const memorial = {
  id: 42,
  slug: "kim-somang-kwonsa",
  name: "김소망",
  role: "권사",
  status: "published",
  visibility: "public",
  accessPasswordHash: null,
  createdByUserId: 7,
};
const slug = { memorialSlug: memorial.slug };
const token = "t".repeat(43);
const validInvitation = {
  invitationId: 1,
  memorialId: 42,
  memorialSlug: memorial.slug,
  memorialName: memorial.name,
  memorialRole: memorial.role,
  memorialOwnerId: 7,
  invitedByUserId: 7,
  expiresAt: new Date(Date.now() + 86400000),
  revokedAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAdminMemorialBySlug.mockResolvedValue(memorial);
  mocks.getAdminMemorialById.mockResolvedValue(memorial);
  // 8번 회원만 초대로 들어온 가족이다.
  mocks.isMemorialFamilyMember.mockImplementation(
    async (_memorialId: number, userId: number) => userId === member.id
  );
  mocks.listMemorialFamilyMembers.mockResolvedValue([
    {
      userId: 8,
      name: "둘째",
      email: "second@example.com",
      phone: null,
      invitedByUserId: 7,
      joinedAt: new Date("2026-09-13T00:00:00Z"),
    },
  ]);
  mocks.getActiveMemorialFamilyInvitation.mockResolvedValue(null);
  mocks.createMemorialFamilyInvitation.mockResolvedValue({
    token,
    expiresAt: validInvitation.expiresAt,
  });
  mocks.addMemorialFamilyMember.mockResolvedValue({ added: true });
});

describe("가족 권한 판단 (shared)", () => {
  const m = { createdByUserId: 7 };

  it("주인·초대받은 가족·관리자는 고칠 수 있고, 남은 못 고친다", () => {
    expect(memorialFamilyRole(m, owner)).toBe("owner");
    expect(memorialFamilyRole(m, member, true)).toBe("member");
    expect(memorialFamilyRole(m, admin)).toBe("admin");
    expect(memorialFamilyRole(m, other, false)).toBe(null);
    expect(memorialFamilyRole(m, null, true)).toBe(null);
    expect(canManageMemorialAsFamily(m, member, true)).toBe(true);
    expect(canManageMemorialAsFamily(m, other, false)).toBe(false);
  });

  it("초대와 제외는 주인과 관리자만 한다", () => {
    expect(canInviteMemorialFamily(m, owner)).toBe(true);
    expect(canInviteMemorialFamily(m, admin)).toBe(true);
    expect(canInviteMemorialFamily(m, member)).toBe(false);
  });

  it("비활성화된 계정과 만든 사람이 지워진 추모관은 막는다", () => {
    expect(
      memorialFamilyRole(m, { ...admin, approvalStatus: "rejected" })
    ).toBe(null);
    expect(memorialFamilyRole({ createdByUserId: null }, owner)).toBe(null);
    // 만든 사람이 지워져도 초대로 들어온 가족은 남는다.
    expect(memorialFamilyRole({ createdByUserId: null }, member, true)).toBe(
      "member"
    );
  });
});

describe("familyMembers.list / createInvitation", () => {
  it("주인은 가족 목록과 초대 상태를 본다", async () => {
    const result = await caller(owner).familyMembers.list(slug);
    expect(result.memorialName).toBe("김소망");
    expect(result.members).toEqual([
      expect.objectContaining({ userId: 8, name: "둘째" }),
    ]);
    expect(result.invitation).toBe(null);
    expect(result.invitationDays).toBe(7);
  });

  it("초대받은 가족과 남은 초대 화면을 못 본다", async () => {
    await expect(caller(member).familyMembers.list(slug)).rejects.toMatchObject(
      { code: "FORBIDDEN" }
    );
    await expect(caller(other).familyMembers.list(slug)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("관리자는 어느 추모관이든 초대할 수 있다", async () => {
    const result = await caller(admin).familyMembers.createInvitation(slug);
    expect(result.href).toBe(`/invite/${token}`);
  });

  it("주인이 만든 초대 링크는 원문 토큰으로 돌아온다", async () => {
    const result = await caller(owner).familyMembers.createInvitation(slug);
    expect(result.href).toBe(`/invite/${token}`);
    expect(mocks.createMemorialFamilyInvitation).toHaveBeenCalledWith({
      memorialId: 42,
      createdByUserId: 7,
    });
  });

  it("초대받은 가족은 또 초대할 수 없다", async () => {
    await expect(
      caller(member).familyMembers.createInvitation(slug)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createMemorialFamilyInvitation).not.toHaveBeenCalled();
  });

  it("없는 추모관은 찾을 수 없다고 알린다", async () => {
    mocks.getAdminMemorialBySlug.mockResolvedValue(null);
    await expect(caller(owner).familyMembers.list(slug)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("familyMembers.removeMember", () => {
  it("주인은 가족을 제외하고 기록이 남는다", async () => {
    await expect(
      caller(owner).familyMembers.removeMember({ ...slug, userId: 8 })
    ).resolves.toEqual({ success: true });
    expect(mocks.removeMemorialFamilyMember).toHaveBeenCalledWith({
      memorialId: 42,
      userId: 8,
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "memorial.family.remove",
        targetUserId: 8,
      })
    );
  });

  it("가족 본인은 스스로 나갈 수 있다", async () => {
    await expect(
      caller(member).familyMembers.removeMember({ ...slug, userId: 8 })
    ).resolves.toEqual({ success: true });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "memorial.family.leave",
        targetUserId: 8,
      })
    );
  });

  it("가족이 다른 가족을 빼지는 못한다", async () => {
    await expect(
      caller(member).familyMembers.removeMember({ ...slug, userId: 9 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.removeMemorialFamilyMember).not.toHaveBeenCalled();
  });
});

describe("familyMembers.invitationInfo / acceptInvitation", () => {
  it("만료되거나 닫힌 링크는 쓸 수 없다고 알린다", async () => {
    mocks.getMemorialFamilyInvitationByToken.mockResolvedValue(null);
    await expect(
      caller(other).familyMembers.invitationInfo({ token })
    ).resolves.toEqual({ valid: false });
    await expect(
      caller(other).familyMembers.acceptInvitation({ token })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.addMemorialFamilyMember).not.toHaveBeenCalled();
  });

  it("살아 있는 링크는 추모관 이름을 보여주고, 이미 가족이면 알려준다", async () => {
    mocks.getMemorialFamilyInvitationByToken.mockResolvedValue(validInvitation);
    const fresh = await caller(other).familyMembers.invitationInfo({ token });
    expect(fresh).toMatchObject({
      valid: true,
      memorialName: "김소망",
      alreadyMember: false,
    });
    const already = await caller(member).familyMembers.invitationInfo({
      token,
    });
    expect(already).toMatchObject({ valid: true, alreadyMember: true });
    const asOwner = await caller(owner).familyMembers.invitationInfo({ token });
    expect(asOwner).toMatchObject({ valid: true, alreadyMember: true });
  });

  it("초대를 받아들이면 가족이 되고 기록이 남는다", async () => {
    mocks.getMemorialFamilyInvitationByToken.mockResolvedValue(validInvitation);
    const result = await caller(other).familyMembers.acceptInvitation({
      token,
    });
    expect(result).toMatchObject({ added: true, href: "/my/memorials" });
    expect(mocks.addMemorialFamilyMember).toHaveBeenCalledWith({
      memorialId: 42,
      userId: 9,
      invitedByUserId: 7,
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "memorial.family.join",
        targetUserId: 9,
      })
    );
  });

  it("주인이 자기 링크를 열어도 가족으로 넣지 않는다", async () => {
    mocks.getMemorialFamilyInvitationByToken.mockResolvedValue(validInvitation);
    mocks.addMemorialFamilyMember.mockResolvedValue({
      added: false,
      reason: "owner",
    });
    const result = await caller(owner).familyMembers.acceptInvitation({
      token,
    });
    expect(result).toMatchObject({ added: false, reason: "owner" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });
});

describe("초대받은 가족의 권한", () => {
  it("게시된 추모관의 글을 직접 고칠 수 있다", async () => {
    await expect(
      caller(member).memorial.updateEditable({ id: 42, summary: "가족이 고침" })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateMemorial).toHaveBeenCalled();
    expect(mocks.isMemorialFamilyMember).toHaveBeenCalledWith(42, 8);
  });

  it("초대받지 않은 남은 여전히 못 고친다", async () => {
    await expect(
      caller(other).memorial.updateEditable({ id: 42, summary: "남이 고침" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateMemorial).not.toHaveBeenCalled();
  });

  it("가족관도 관리할 수 있다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue({
      memorialId: 42,
      memorialSlug: memorial.slug,
      memorialName: memorial.name,
      memorialStatus: "published",
      createdByUserId: 7,
      exists: false,
      title: "",
      intro: "",
      updatedAt: null,
      href: `/memorial/${memorial.slug}/family`,
    });
    const result = await caller(member).familyRoom.manage(slug);
    expect(result.exists).toBe(false);
    await expect(caller(other).familyRoom.manage(slug)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
