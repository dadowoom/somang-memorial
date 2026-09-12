import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { canManageMemorialFamilyRoom } from "../shared/memorialFamilyRoomPermissions";

const mocks = vi.hoisted(() => ({
  getMemorialFamilyRoomManageInfo: vi.fn(),
  createMemorialFamilyRoom: vi.fn(),
  updateMemorialFamilyRoomInfo: vi.fn(),
  updateMemorialFamilyRoomPassword: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const other = { ...owner, id: 8 };
const admin = { ...owner, id: 9, role: "admin" };

const context = (user: typeof owner | null): TrpcContext =>
  ({ user, req: {}, res: {} }) as unknown as TrpcContext;

const caller = (user: typeof owner | null) =>
  appRouter.createCaller(context(user));

/** 가족관이 아직 없는 추모관. */
const withoutRoom = {
  memorialId: 42,
  memorialSlug: "kim-somang-kwonsa",
  memorialName: "김소망",
  memorialStatus: "published",
  createdByUserId: 7,
  exists: false,
  title: "",
  intro: "",
  updatedAt: null,
  href: "/memorial/kim-somang-kwonsa/family",
};

/** 이미 가족관이 있는 추모관. */
const withRoom = {
  ...withoutRoom,
  exists: true,
  title: "김소망 권사님 가족관",
  intro: "가족끼리 기억을 나누는 곳입니다.",
  updatedAt: new Date("2026-05-22T14:49:19Z"),
};

const slug = { memorialSlug: "kim-somang-kwonsa" };
const newRoom = {
  ...slug,
  title: "가족관",
  intro: "가족끼리 기억을 나눕니다.",
  password: "somang2026",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createMemorialFamilyRoom.mockResolvedValue({ created: true });
});

describe("가족관 관리 권한", () => {
  const memorial = { createdByUserId: 7 };

  it("만든 유가족 본인과 교회 관리자만 통과한다", () => {
    expect(canManageMemorialFamilyRoom(memorial, owner)).toBe(true);
    expect(canManageMemorialFamilyRoom(memorial, admin)).toBe(true);
    expect(canManageMemorialFamilyRoom(memorial, other)).toBe(false);
    expect(canManageMemorialFamilyRoom(memorial, null)).toBe(false);
    expect(canManageMemorialFamilyRoom(null, admin)).toBe(false);
  });

  it("비활성화된 계정은 관리자라도 막는다", () => {
    expect(
      canManageMemorialFamilyRoom(memorial, {
        ...admin,
        approvalStatus: "rejected",
      })
    ).toBe(false);
  });

  // 만든 사람이 탈퇴하면 그 칸이 비고, 추모관은 남는다.
  it("만든 사람이 지워진 추모관은 아무나 주인이 되지 않는다", () => {
    expect(canManageMemorialFamilyRoom({ createdByUserId: null }, owner)).toBe(
      false
    );
  });

  // 사진첩은 게시된 뒤 유가족이 못 고치지만, 가족관은 공개 화면에 안 나오므로 다르다.
  it("게시된 추모관이어도 유가족이 가족관을 고칠 수 있다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue({
      ...withRoom,
      memorialStatus: "published",
    });

    await expect(
      caller(owner).familyRoom.updatePassword({
        ...slug,
        password: "새로운비밀번호",
      })
    ).resolves.toEqual({ success: true });
  });
});

describe("familyRoom.manage", () => {
  it("비밀번호는 어떤 형태로도 돌려주지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    const result = await caller(owner).familyRoom.manage(slug);

    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("password");
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(result.exists).toBe(true);
    expect(result.title).toBe("김소망 권사님 가족관");
  });

  it("남의 추모관은 권한 없음으로 막는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(caller(other).familyRoom.manage(slug)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("없는 추모관은 찾을 수 없다고 알린다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(null);

    await expect(caller(owner).familyRoom.manage(slug)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("로그인하지 않으면 쓸 수 없다", async () => {
    await expect(caller(null).familyRoom.manage(slug)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("familyRoom.create", () => {
  it("가족관이 없을 때 만든다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withoutRoom);

    await expect(caller(owner).familyRoom.create(newRoom)).resolves.toEqual({
      success: true,
    });
    expect(mocks.createMemorialFamilyRoom).toHaveBeenCalledWith({
      memorialId: 42,
      title: "가족관",
      intro: "가족끼리 기억을 나눕니다.",
      password: "somang2026",
    });
  });

  it("이미 있으면 덮어쓰지 않고 알린다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(owner).familyRoom.create(newRoom)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createMemorialFamilyRoom).not.toHaveBeenCalled();
  });

  // 두 번 눌러 두 개가 생기면 어느 쪽 비밀번호가 맞는지 알 수 없게 된다.
  it("확인과 저장 사이에 먼저 만들어졌으면 두 개를 만들지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withoutRoom);
    mocks.createMemorialFamilyRoom.mockResolvedValue({ created: false });

    await expect(
      caller(owner).familyRoom.create(newRoom)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("짧은 비밀번호는 받지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withoutRoom);

    await expect(
      caller(owner).familyRoom.create({ ...newRoom, password: "1234" })
    ).rejects.toThrow(/6자 이상/);
    expect(mocks.createMemorialFamilyRoom).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 만들 수 없다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withoutRoom);

    await expect(
      caller(other).familyRoom.create(newRoom)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createMemorialFamilyRoom).not.toHaveBeenCalled();
  });
});

describe("familyRoom.updatePassword", () => {
  it("가족관 비밀번호를 바꾼다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(owner).familyRoom.updatePassword({
        ...slug,
        password: "새로운비밀번호",
      })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateMemorialFamilyRoomPassword).toHaveBeenCalledWith({
      memorialId: 42,
      password: "새로운비밀번호",
    });
  });

  it("가족관이 아직 없으면 먼저 만들라고 알린다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withoutRoom);

    await expect(
      caller(owner).familyRoom.updatePassword({
        ...slug,
        password: "새로운비밀번호",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.updateMemorialFamilyRoomPassword).not.toHaveBeenCalled();
  });

  it("남의 가족관 비밀번호는 못 바꾼다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(other).familyRoom.updatePassword({
        ...slug,
        password: "새로운비밀번호",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateMemorialFamilyRoomPassword).not.toHaveBeenCalled();
  });

  it("짧은 비밀번호로는 못 바꾼다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(owner).familyRoom.updatePassword({ ...slug, password: "1234" })
    ).rejects.toThrow(/6자 이상/);
    expect(mocks.updateMemorialFamilyRoomPassword).not.toHaveBeenCalled();
  });
});

describe("familyRoom.updateInfo", () => {
  it("제목과 소개글을 고친다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(admin).familyRoom.updateInfo({
        ...slug,
        title: "새 제목",
        intro: "새 소개글",
      })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateMemorialFamilyRoomInfo).toHaveBeenCalledWith({
      memorialId: 42,
      title: "새 제목",
      intro: "새 소개글",
    });
  });

  it("빈 제목은 받지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(withRoom);

    await expect(
      caller(owner).familyRoom.updateInfo({
        ...slug,
        title: "  ",
        intro: "소개",
      })
    ).rejects.toThrow(/제목/);
    expect(mocks.updateMemorialFamilyRoomInfo).not.toHaveBeenCalled();
  });
});
