import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 추억책 사진 주소 (2026-09-25): 앨범 사진과 같게, 비공개·작성 중 추모관의
// 추억책 사진은 기한이 적힌 주소로만 내준다. DB 는 가짜로 대신한다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET ||= "test-secret-book-photo";
  return {
    listMemorialBooks: vi.fn(),
    listMemorialBookPages: vi.fn(),
    getMemorialBookById: vi.fn(),
    createMemorialBook: vi.fn(),
    updateMemorialBook: vi.fn(),
    createMemorialBookPage: vi.fn(),
    updateMemorialBookPage: vi.fn(),
    requireReadableMemorialById: vi.fn(),
    storagePut: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});
vi.mock("./routers/memorialAccess", () => ({
  requireReadableMemorialById: mocks.requireReadableMemorialById,
}));
vi.mock("./storage", () => ({
  storagePut: mocks.storagePut,
  UPLOAD_URL_PREFIX: "/uploads",
}));

import { bookRouter } from "./routers/book";
import { uploadRouter } from "./routers/upload";
import { parseUploadPath, signMediaUrl } from "./_core/protectedMedia";

const admin = { id: 1, role: "admin", approvalStatus: "approved" };
const caller = (user: typeof admin | null) =>
  bookRouter.createCaller({ user, req: {}, res: {} } as unknown as TrpcContext);

const privateMemorial = {
  id: 5,
  slug: "private-book",
  visibility: "private",
  status: "published",
  accessPasswordHash: "scrypt:x",
};
const pendingMemorial = {
  ...privateMemorial,
  visibility: "public",
  status: "pending",
};
const publicMemorial = {
  ...privateMemorial,
  visibility: "public",
  accessPasswordHash: null,
};

const cover = "/uploads/book-covers/cover_1.png";
const pagePhoto = "/uploads/book-pages/page_1.jpg";
const book = {
  id: 11,
  memorialId: 5,
  title: "추억책",
  coverPhotoUrl: cover,
  coverPhotoKey: "book-covers/cover_1.png",
};
const page = {
  id: 21,
  bookId: 11,
  photoUrl: pagePhoto,
  photoKey: "book-pages/page_1.jpg",
};

const isSignedFor = (url: string | null | undefined, key: string) => {
  const parsed = parseUploadPath((url ?? "").replace(/^\/uploads/, ""));
  return parsed?.kind === "signed" && parsed.key === key;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listMemorialBooks.mockResolvedValue([book]);
  mocks.listMemorialBookPages.mockResolvedValue([page]);
  mocks.getMemorialBookById.mockResolvedValue(book);
});

describe("추억책 사진 주소", () => {
  it("비공개·작성 중 추모관은 표지·쪽 사진을 기한이 적힌 주소로 내준다", async () => {
    for (const memorial of [privateMemorial, pendingMemorial]) {
      mocks.requireReadableMemorialById.mockResolvedValue(memorial);
      const [listed] = await caller(null).listByMemorial({ memorialId: 5 });
      expect(isSignedFor(listed.coverPhotoUrl, "book-covers/cover_1.png")).toBe(
        true
      );
      expect(
        isSignedFor(listed.pages[0].photoUrl, "book-pages/page_1.jpg")
      ).toBe(true);

      const one = await caller(null).getById({ id: 11 });
      expect(isSignedFor(one.coverPhotoUrl, "book-covers/cover_1.png")).toBe(
        true
      );
      expect(isSignedFor(one.pages[0].photoUrl, "book-pages/page_1.jpg")).toBe(
        true
      );
    }
  });

  it("공개 추모관은 지금처럼 그냥 주소다", async () => {
    mocks.requireReadableMemorialById.mockResolvedValue(publicMemorial);
    const [listed] = await caller(null).listByMemorial({ memorialId: 5 });
    expect(listed.coverPhotoUrl).toBe(cover);
    expect(listed.pages[0].photoUrl).toBe(pagePhoto);
  });

  it("관리자가 기한 주소를 그대로 저장해도 DB 에는 원래 주소가 들어간다", async () => {
    const signedCover = signMediaUrl(cover);
    const signedPage = signMediaUrl(pagePhoto);
    expect(signedCover).not.toBe(cover);

    await caller(admin).create({
      memorialId: 5,
      title: "새 책",
      coverPhotoUrl: signedCover,
    });
    expect(mocks.createMemorialBook).toHaveBeenCalledWith(
      expect.objectContaining({ coverPhotoUrl: cover })
    );
    await caller(admin).update({ id: 11, coverPhotoUrl: signedCover });
    expect(mocks.updateMemorialBook).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ coverPhotoUrl: cover })
    );
    await caller(admin).addPage({ bookId: 11, photoUrl: signedPage });
    expect(mocks.createMemorialBookPage).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: pagePhoto })
    );
    await caller(admin).updatePage({ id: 21, photoUrl: signedPage });
    expect(mocks.updateMemorialBookPage).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ photoUrl: pagePhoto })
    );
  });

  it("추억책 사진을 올리면 미리보기용으로 기한이 적힌 주소를 준다", async () => {
    // 실제 저장은 이름 뒤에 글자를 붙인다 (storage.ts).
    mocks.storagePut.mockImplementation(async (key: string) => {
      const stored = key.replace(".png", "_a1b2c3d4.png");
      return { key: stored, url: `/uploads/${stored}` };
    });
    const upload = uploadRouter.createCaller({
      user: admin,
      req: {},
      res: {},
    } as unknown as TrpcContext);
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    for (const folder of ["book-pages", "book-covers"] as const) {
      const result = await upload.image({
        dataUrl: png,
        fileName: "a.png",
        folder,
      });
      expect(result.key.startsWith(`${folder}/`)).toBe(true);
      expect(result.key.endsWith("_a1b2c3d4.png")).toBe(true);
      expect(isSignedFor(result.url, result.key)).toBe(true);
    }
  });
});
