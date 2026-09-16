import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getAdminMemorialById: vi.fn(),
  isMemorialFamilyMember: vi.fn(),
  canUserReadMemorialWithFamily: vi.fn(),
  listMemorialVideos: vi.fn(),
  createMemorialVideo: vi.fn(),
  updateMemorialVideo: vi.fn(),
  deleteMemorialVideo: vi.fn(),
  getMemorialVideoById: vi.fn(),
}));
vi.mock("./db", () => mocks);

import { MEMBER_VIDEO_LIMIT, videoRouter } from "./routers/video";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const family = { ...owner, id: 11 };
const other = { ...owner, id: 8 };
const admin = { ...owner, id: 9, role: "admin" };
const memorial = { id: 42, createdByUserId: 7, status: "published" };
const context = (user: typeof owner | null): TrpcContext =>
  ({ user, req: {}, res: {} }) as TrpcContext;
const caller = (user: typeof owner | null) =>
  videoRouter.createCaller(context(user));

const shareUrl = "https://youtu.be/dQw4w9WgXcQ?si=abc";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAdminMemorialById.mockResolvedValue(memorial);
  mocks.isMemorialFamilyMember.mockResolvedValue(false);
  mocks.canUserReadMemorialWithFamily.mockResolvedValue(true);
  mocks.listMemorialVideos.mockResolvedValue([]);
  mocks.getMemorialVideoById.mockResolvedValue({ id: 5, memorialId: 42 });
});

describe("video.create (2026-09-16: 가족도 유튜브 영상을 넣는다)", () => {
  it("추모관 주인이 유튜브 공유 주소를 붙여 넣으면 영상 번호만 저장한다", async () => {
    await expect(
      caller(owner).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).resolves.toEqual({ success: true, youtubeVideoId: "dQw4w9WgXcQ" });
    expect(mocks.createMemorialVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        memorialId: 42,
        youtubeVideoId: "dQw4w9WgXcQ",
        title: "추모 영상",
        isVisible: 1,
        sortOrder: 0,
      })
    );
  });

  it("초대받은 가족도 넣을 수 있다", async () => {
    mocks.isMemorialFamilyMember.mockResolvedValue(true);
    await expect(
      caller(family).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).resolves.toMatchObject({ success: true });
    expect(mocks.isMemorialFamilyMember).toHaveBeenCalledWith(42, 11);
  });

  it("남의 추모관에는 넣을 수 없다", async () => {
    await expect(
      caller(other).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createMemorialVideo).not.toHaveBeenCalled();
  });

  it("로그인하지 않았으면 넣을 수 없다", async () => {
    await expect(
      caller(null).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.createMemorialVideo).not.toHaveBeenCalled();
  });

  it("유튜브 주소가 아니면 알아듣게 거절한다", async () => {
    await expect(
      caller(owner).create({
        memorialId: 42,
        youtubeVideoId: "https://example.com/video",
      })
    ).rejects.toThrow(/유튜브 주소를 확인/);
    expect(mocks.createMemorialVideo).not.toHaveBeenCalled();
  });

  it("가족은 정해진 개수까지만, 관리자는 제한 없이 넣는다", async () => {
    mocks.listMemorialVideos.mockResolvedValue(
      Array.from({ length: MEMBER_VIDEO_LIMIT }, (_, id) => ({ id }))
    );
    await expect(
      caller(owner).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(admin).create({ memorialId: 42, youtubeVideoId: shareUrl })
    ).resolves.toMatchObject({ success: true });
    expect(mocks.createMemorialVideo).toHaveBeenCalledTimes(1);
  });
});

describe("video.update / video.delete", () => {
  it("영상이 속한 추모관의 주인만 고치고 지운다", async () => {
    await expect(
      caller(owner).update({ id: 5, isVisible: false })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateMemorialVideo).toHaveBeenCalledWith(5, {
      isVisible: 0,
    });
    await expect(caller(owner).delete({ id: 5 })).resolves.toEqual({
      success: true,
    });
    expect(mocks.deleteMemorialVideo).toHaveBeenCalledWith(5);
  });

  it("다른 사람의 영상은 고치거나 지울 수 없다", async () => {
    await expect(
      caller(other).update({ id: 5, title: "바꿈" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(other).delete({ id: 5 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.updateMemorialVideo).not.toHaveBeenCalled();
    expect(mocks.deleteMemorialVideo).not.toHaveBeenCalled();
  });

  it("없는 영상이면 찾을 수 없다고 알린다", async () => {
    mocks.getMemorialVideoById.mockResolvedValue(null);
    await expect(caller(owner).delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("video.listByMemorial", () => {
  const videos = [
    { id: 1, isVisible: 1 },
    { id: 2, isVisible: 0 },
  ];

  it("숨긴 영상은 방문자에게 보이지 않는다", async () => {
    mocks.listMemorialVideos.mockResolvedValue(videos);
    await expect(
      caller(null).listByMemorial({ memorialId: 42 })
    ).resolves.toEqual([{ id: 1, isVisible: 1 }]);
  });

  it("추모관 주인은 숨긴 영상도 보고 다시 공개할 수 있다", async () => {
    mocks.listMemorialVideos.mockResolvedValue(videos);
    await expect(
      caller(owner).listByMemorial({ memorialId: 42 })
    ).resolves.toEqual(videos);
  });
});
