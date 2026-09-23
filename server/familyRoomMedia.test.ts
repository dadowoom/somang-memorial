import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 가족관 영상·사진 (2026-09-16). 핵심은 "가족관마다 따로" — 사진은 가족관 번호로만
// 저장·삭제되고, 남의 추모관에는 아무것도 못 한다.
const mocks = vi.hoisted(() => {
  // 가족관 사진 주소에 서명할 때 쓴다 (protectedMedia.ts).
  process.env.JWT_SECRET ||= "test-secret-family-room";
  return {
    getMemorialFamilyRoomManageInfo: vi.fn(),
    updateMemorialFamilyRoomVideo: vi.fn(),
    addFamilyRoomPhoto: vi.fn(),
    deleteFamilyRoomPhoto: vi.fn(),
    updateFamilyRoomPhoto: vi.fn(),
    reorderFamilyRoomPhotos: vi.fn(),
    isMemorialFamilyMember: vi.fn(),
    createAdminAuditLog: vi.fn(),
    storagePut: vi.fn(),
    decodeImageDataUrl: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});
vi.mock("./storage", () => ({
  storagePut: mocks.storagePut,
  UPLOAD_URL_PREFIX: "/uploads",
}));
vi.mock("./_core/imageUpload", () => ({
  decodeImageDataUrl: mocks.decodeImageDataUrl,
}));

import { appRouter } from "./routers";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const other = { ...owner, id: 8 };

const context = (user: typeof owner | null): TrpcContext =>
  ({ user, req: {}, res: {} }) as unknown as TrpcContext;
const caller = (user: typeof owner | null) =>
  appRouter.createCaller(context(user));

const room = {
  memorialId: 42,
  memorialSlug: "kim-somang-kwonsa",
  memorialName: "김소망",
  memorialStatus: "published",
  createdByUserId: 7,
  exists: true,
  roomId: 500,
  title: "가족관",
  intro: "가족끼리",
  updatedAt: null,
  video: null,
  photos: [{ id: 1, photoUrl: "/uploads/a.jpg", caption: null, sortOrder: 1 }],
  href: "/memorial/kim-somang-kwonsa/family",
};
const slug = { memorialSlug: "kim-somang-kwonsa" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isMemorialFamilyMember.mockResolvedValue(false);
  mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(room);
  mocks.decodeImageDataUrl.mockReturnValue({
    buffer: Buffer.from("x"),
    mimeType: "image/jpeg",
    ext: "jpg",
  });
  mocks.storagePut.mockResolvedValue({
    key: "family-rooms/500/abc.jpg",
    url: "/uploads/family-rooms/500/abc.jpg",
  });
  mocks.deleteFamilyRoomPhoto.mockResolvedValue({ deleted: true });
  mocks.updateFamilyRoomPhoto.mockResolvedValue({ updated: true });
});

describe("familyRoom.updateVideo", () => {
  it("유튜브 주소를 붙여 넣으면 번호만 저장한다", async () => {
    await expect(
      caller(owner).familyRoom.updateVideo({
        ...slug,
        youtube: "https://youtu.be/dQw4w9WgXcQ?si=x",
        title: "가족에게",
        description: "인사",
      })
    ).resolves.toEqual({ success: true, youtubeVideoId: "dQw4w9WgXcQ" });
    expect(mocks.updateMemorialFamilyRoomVideo).toHaveBeenCalledWith({
      memorialId: 42,
      youtubeVideoId: "dQw4w9WgXcQ",
      videoTitle: "가족에게",
      videoDescription: "인사",
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "family_room.video.update" })
    );
  });

  it("빈칸이면 영상을 뺀다", async () => {
    await caller(owner).familyRoom.updateVideo({ ...slug, youtube: "" });
    expect(mocks.updateMemorialFamilyRoomVideo).toHaveBeenCalledWith({
      memorialId: 42,
      youtubeVideoId: null,
      videoTitle: null,
      videoDescription: null,
    });
  });

  it("알아볼 수 없는 주소는 저장하지 않고 알린다", async () => {
    await expect(
      caller(owner).familyRoom.updateVideo({
        ...slug,
        youtube: "https://example.com/not-youtube",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateMemorialFamilyRoomVideo).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 못 한다", async () => {
    await expect(
      caller(other).familyRoom.updateVideo({ ...slug, youtube: "" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("familyRoom.addPhoto", () => {
  const photo = {
    ...slug,
    dataUrl: "data:image/jpeg;base64,AAAA",
    fileName: "a.jpg",
  };

  it("사진 파일을 가족관 번호 폴더에 저장하고 그 가족관에만 묶는다", async () => {
    await expect(
      caller(owner).familyRoom.addPhoto({ ...photo, caption: "생신날" })
    ).resolves.toEqual({
      success: true,
      // 돌려주는 주소는 기한이 적힌 주소다. DB 에는 원래 주소를 적는다.
      url: expect.stringMatching(
        /^\/uploads\/s\/\d+\.[A-Za-z0-9_-]+\/family-rooms\/500\/abc\.jpg$/
      ),
    });
    const [key] = mocks.storagePut.mock.calls[0];
    expect(key).toMatch(/^family-rooms\/500\/[A-Za-z0-9_-]+\.jpg$/);
    expect(mocks.addFamilyRoomPhoto).toHaveBeenCalledWith({
      familyRoomId: 500,
      photoUrl: "/uploads/family-rooms/500/abc.jpg",
      photoKey: expect.stringMatching(/^family-rooms\/500\//),
      caption: "생신날",
    });
  });

  it("가족관이 아직 없으면 올릴 수 없다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue({
      ...room,
      exists: false,
      roomId: null,
      photos: [],
    });
    await expect(
      caller(owner).familyRoom.addPhoto(photo)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("장수 제한을 넘기면 받지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue({
      ...room,
      photos: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        photoUrl: "/uploads/x.jpg",
        caption: null,
        sortOrder: i,
      })),
    });
    await expect(
      caller(owner).familyRoom.addPhoto(photo)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 못 올린다", async () => {
    await expect(
      caller(other).familyRoom.addPhoto(photo)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});

describe("familyRoom.deletePhoto", () => {
  it("사진 번호와 가족관 번호를 같이 넘겨 이 가족관 사진만 지운다", async () => {
    await expect(
      caller(owner).familyRoom.deletePhoto({ ...slug, photoId: 1 })
    ).resolves.toEqual({ success: true });
    expect(mocks.deleteFamilyRoomPhoto).toHaveBeenCalledWith(1, 500);
  });

  it("다른 가족관의 사진 번호는 '없음'으로 끝난다", async () => {
    mocks.deleteFamilyRoomPhoto.mockResolvedValue({ deleted: false });
    await expect(
      caller(owner).familyRoom.deletePhoto({ ...slug, photoId: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 못 한다", async () => {
    await expect(
      caller(other).familyRoom.deletePhoto({ ...slug, photoId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.deleteFamilyRoomPhoto).not.toHaveBeenCalled();
  });
});

// 가족관 사진도 추모관 앨범처럼 설명·연도를 고치고 순서를 바꾼다 (2026-09-16).
describe("familyRoom.updatePhoto", () => {
  it("설명과 연도를 이 가족관의 사진에만 저장하고 기록을 남긴다", async () => {
    await expect(
      caller(owner).familyRoom.updatePhoto({
        ...slug,
        photoId: 1,
        caption: " 할머니 생신 ",
        year: "1998",
      })
    ).resolves.toEqual({ success: true });
    expect(mocks.updateFamilyRoomPhoto).toHaveBeenCalledWith(1, 500, {
      caption: "할머니 생신",
      year: "1998",
    });
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "family_room.photo.update",
        beforeValue: "1",
        afterValue: "할머니 생신 · 1998",
        targetUserId: 7,
      })
    );
  });

  it("보낸 칸만 고치고, 빈칸은 지운 것으로 저장한다", async () => {
    await caller(owner).familyRoom.updatePhoto({
      ...slug,
      photoId: 1,
      year: "",
    });
    expect(mocks.updateFamilyRoomPhoto).toHaveBeenCalledWith(1, 500, {
      year: null,
    });
  });

  it("고칠 내용이 없으면 저장하지 않는다", async () => {
    await expect(
      caller(owner).familyRoom.updatePhoto({ ...slug, photoId: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateFamilyRoomPhoto).not.toHaveBeenCalled();
  });

  it("다른 가족관의 사진 번호는 없음으로 끝나고 기록도 남기지 않는다", async () => {
    mocks.updateFamilyRoomPhoto.mockResolvedValue({ updated: false });
    await expect(
      caller(owner).familyRoom.updatePhoto({
        ...slug,
        photoId: 999,
        caption: "남의 사진",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 못 한다", async () => {
    await expect(
      caller(other).familyRoom.updatePhoto({
        ...slug,
        photoId: 1,
        caption: "x",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateFamilyRoomPhoto).not.toHaveBeenCalled();
  });
});

describe("familyRoom.reorderPhotos", () => {
  const twoPhotos = {
    ...room,
    photos: [
      {
        id: 1,
        photoUrl: "/uploads/a.jpg",
        caption: null,
        year: null,
        sortOrder: 1,
      },
      {
        id: 2,
        photoUrl: "/uploads/b.jpg",
        caption: null,
        year: null,
        sortOrder: 2,
      },
    ],
  };

  it("보낸 순서대로 이 가족관의 사진 순서를 저장한다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(twoPhotos);
    await expect(
      caller(owner).familyRoom.reorderPhotos({ ...slug, photoIds: [2, 1] })
    ).resolves.toEqual({ success: true });
    expect(mocks.reorderFamilyRoomPhotos).toHaveBeenCalledWith(500, [2, 1]);
    expect(mocks.createAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "family_room.photo.reorder",
        afterValue: "2,1",
      })
    );
  });

  it("그사이 사진이 늘거나 줄었으면 순서를 저장하지 않는다", async () => {
    mocks.getMemorialFamilyRoomManageInfo.mockResolvedValue(twoPhotos);
    for (const photoIds of [[1], [1, 2, 3], [1, 1], [2, 999]]) {
      await expect(
        caller(owner).familyRoom.reorderPhotos({ ...slug, photoIds })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(mocks.reorderFamilyRoomPhotos).not.toHaveBeenCalled();
    expect(mocks.createAdminAuditLog).not.toHaveBeenCalled();
  });

  it("남의 추모관에는 못 한다", async () => {
    await expect(
      caller(other).familyRoom.reorderPhotos({ ...slug, photoIds: [1] })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.reorderFamilyRoomPhotos).not.toHaveBeenCalled();
  });
});
