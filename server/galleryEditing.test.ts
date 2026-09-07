import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { canManageMemorialGallery } from "../shared/memorialGalleryPermissions";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getAdminMemorialById: vi.fn(),
  listMemorialGalleryPhotos: vi.fn(),
  storagePut: vi.fn(),
  decodeImageDataUrl: vi.fn(),
  requireReadableMemorialById: vi.fn(),
}));
vi.mock("./db", () => mocks);
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("./_core/imageUpload", () => ({
  decodeImageDataUrl: mocks.decodeImageDataUrl,
}));
vi.mock("./routers/memorialAccess", () => ({
  requireReadableMemorialById: mocks.requireReadableMemorialById,
}));

import { withGalleryEditor } from "./galleryEditing";
import { galleryRouter } from "./routers/gallery";

const owner = { id: 7, role: "user", approvalStatus: "approved" };
const other = { ...owner, id: 8 };
const admin = { ...owner, id: 9, role: "admin" };
const pending = { id: 42, createdByUserId: 7, status: "pending" };
const photo = { id: 101, memorialId: 42 };
const context = (user: typeof owner | null): TrpcContext =>
  ({ user, req: {}, res: {} }) as TrpcContext;

// Every operation uses an in-memory database double. No real connection or data is used.
function database(...results: unknown[][]) {
  const locks = vi.fn();
  const insertValues = vi.fn().mockResolvedValue([]);
  const updateWhere = vi.fn().mockResolvedValue([]);
  const deleteWhere = vi.fn().mockResolvedValue([]);
  const set = vi.fn(() => ({ where: updateWhere }));
  const tx = {
    select: vi.fn(() => {
      const rows = results.shift();
      if (!rows) throw new Error("Unexpected test database read");
      const query = {
        from: vi.fn(() => query),
        where: vi.fn(() => query),
        limit: vi.fn(() => query),
        for: vi.fn((mode: string) => {
          locks(mode);
          return Promise.resolve(rows);
        }),
        then: (
          resolve: (value: unknown[]) => unknown,
          reject: (reason: unknown) => unknown
        ) => Promise.resolve(rows).then(resolve, reject),
      };
      return query;
    }),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
  mocks.getDb.mockResolvedValue({
    transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
  });
  return { tx, locks, insertValues, set, updateWhere, deleteWhere };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.storagePut.mockResolvedValue({ url: "/uploads/test-photo.jpg" });
  mocks.decodeImageDataUrl.mockReturnValue({
    buffer: Buffer.from("fixture"),
    mimeType: "image/jpeg",
    ext: "jpg",
  });
});

describe("gallery editing policy", () => {
  for (const status of ["pending", "published", "private"]) {
    for (const visibility of ["public", "private"]) {
      it(`${status}/${visibility}: only its pending owner or an active admin may edit`, () => {
        const memorial = { ...pending, status, visibility };
        expect(canManageMemorialGallery(memorial, owner)).toBe(
          status === "pending"
        );
        expect(canManageMemorialGallery(memorial, other)).toBe(false);
        expect(canManageMemorialGallery(memorial, null)).toBe(false);
        expect(canManageMemorialGallery(memorial, admin)).toBe(true);
        expect(
          canManageMemorialGallery(memorial, {
            ...admin,
            approvalStatus: "rejected",
          })
        ).toBe(false);
      });
    }
  }
  it("denies missing memorials and unowned or unknown-status member records", () => {
    expect(canManageMemorialGallery(null, admin)).toBe(false);
    expect(
      canManageMemorialGallery({ ...pending, createdByUserId: null }, owner)
    ).toBe(false);
    expect(
      canManageMemorialGallery({ ...pending, status: "unknown" }, owner)
    ).toBe(false);
  });
});

describe("gallery transaction boundary", () => {
  it("locks the parent before permitting an owner edit", async () => {
    const db = database([pending]);
    const edit = vi.fn(async () => {
      expect(db.locks).toHaveBeenCalledWith("update");
      return "edited";
    });
    await expect(
      withGalleryEditor(owner, { memorialId: 42 }, edit)
    ).resolves.toBe("edited");
    expect(edit).toHaveBeenCalledWith(db.tx, 42, undefined);
  });
  it("rechecks status in the transaction instead of trusting the earlier permission query", async () => {
    database([{ ...pending, status: "published" }]);
    const edit = vi.fn();
    await expect(
      withGalleryEditor(owner, { memorialId: 42 }, edit)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(edit).not.toHaveBeenCalled();
  });
  it("rechecks the photo inside its locked parent", async () => {
    const db = database([photo], [pending], [photo]);
    const edit = vi.fn().mockResolvedValue("edited");
    await withGalleryEditor(owner, { photoId: 101 }, edit);
    expect(db.locks).toHaveBeenCalledTimes(2);
    expect(edit).toHaveBeenCalledWith(db.tx, 42, photo);
  });
  it("stops if a photo disappears between lookup and locked recheck", async () => {
    database([photo], [pending], []);
    const edit = vi.fn();
    await expect(
      withGalleryEditor(owner, { photoId: 101 }, edit)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(edit).not.toHaveBeenCalled();
  });
  it("fails safely when the database is unavailable", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(
      withGalleryEditor(owner, { memorialId: 42 }, vi.fn())
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("gallery API", () => {
  const uploadInput = {
    memorialId: 42,
    dataUrl: "fixture",
    fileName: "photo.jpg",
  };
  const mutations = [
    {
      name: "upload",
      readsPhoto: false,
      run: (caller: ReturnType<typeof galleryRouter.createCaller>) =>
        caller.upload(uploadInput),
    },
    {
      name: "update",
      readsPhoto: true,
      run: (caller: ReturnType<typeof galleryRouter.createCaller>) =>
        caller.update({ id: 101, caption: "기억" }),
    },
    {
      name: "representative",
      readsPhoto: false,
      run: (caller: ReturnType<typeof galleryRouter.createCaller>) =>
        caller.setRepresentative({ memorialId: 42, id: 101 }),
    },
    {
      name: "delete",
      readsPhoto: true,
      run: (caller: ReturnType<typeof galleryRouter.createCaller>) =>
        caller.delete({ id: 101 }),
    },
  ];
  for (const mutation of mutations) {
    it(`${mutation.name}: blocks anonymous and disabled accounts before any database call`, async () => {
      for (const user of [null, { ...owner, approvalStatus: "rejected" }]) {
        await expect(
          mutation.run(galleryRouter.createCaller(context(user)))
        ).rejects.toMatchObject({ code: user ? "FORBIDDEN" : "UNAUTHORIZED" });
      }
      expect(mocks.getDb).not.toHaveBeenCalled();
      expect(mocks.storagePut).not.toHaveBeenCalled();
    });
    it(`${mutation.name}: blocks other owners and published or legacy-private records before writing`, async () => {
      for (const [user, memorial] of [
        [other, pending],
        [owner, { ...pending, status: "published" }],
        [owner, { ...pending, status: "private" }],
      ] as const) {
        const db = database(
          ...(mutation.readsPhoto ? [[photo], [memorial]] : [[memorial]])
        );
        await expect(
          mutation.run(galleryRouter.createCaller(context(user)))
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(db.tx.insert).not.toHaveBeenCalled();
        expect(db.tx.update).not.toHaveBeenCalled();
        expect(db.tx.delete).not.toHaveBeenCalled();
        expect(mocks.storagePut).not.toHaveBeenCalled();
      }
    });
  }
  it("allows pending owner upload and makes the first photo representative", async () => {
    const db = database([pending], []);
    await expect(
      galleryRouter.createCaller(context(owner)).upload(uploadInput)
    ).resolves.toMatchObject({ success: true });
    expect(db.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ memorialId: 42, isRepresentative: 1 })
    );
  });
  it("keeps the existing representative when more photos are added", async () => {
    const db = database([pending], [photo]);
    await galleryRouter.createCaller(context(owner)).upload(uploadInput);
    expect(db.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ isRepresentative: 0 })
    );
  });
  it("enforces the member photo limit before storing a file", async () => {
    database(
      [pending],
      Array.from({ length: 30 }, (_, id) => ({ id }))
    );
    await expect(
      galleryRouter.createCaller(context(owner)).upload(uploadInput)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
  it("preserves admin editing on published memorials and the existing unlimited allowance", async () => {
    const db = database(
      [{ ...pending, status: "published" }],
      Array.from({ length: 30 }, (_, id) => ({ id }))
    );
    await galleryRouter.createCaller(context(admin)).upload(uploadInput);
    expect(db.insertValues).toHaveBeenCalledTimes(1);
  });
  it("does not clear representatives if the selected photo is not in this memorial", async () => {
    const db = database([pending], []);
    await expect(
      galleryRouter
        .createCaller(context(owner))
        .setRepresentative({ memorialId: 42, id: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.tx.update).not.toHaveBeenCalled();
  });
  it("allows the pending owner to set a representative, edit a caption, and remove a photo", async () => {
    const caller = galleryRouter.createCaller(context(owner));
    let db = database([pending], [photo]);
    await caller.setRepresentative({ memorialId: 42, id: 101 });
    expect(db.set.mock.calls).toEqual([
      [{ isRepresentative: 0 }],
      [{ isRepresentative: 1 }],
    ]);
    db = database([photo], [pending], [photo]);
    await caller.update({ id: 101, caption: "소중한 추억" });
    expect(db.set).toHaveBeenCalledWith({ caption: "소중한 추억" });
    db = database([photo], [pending], [photo]);
    await caller.delete({ id: 101 });
    expect(db.deleteWhere).toHaveBeenCalledTimes(1);
  });
  it("does not store files when image validation fails", async () => {
    const db = database([pending], []);
    mocks.decodeImageDataUrl.mockImplementation(() => {
      throw new Error("invalid image fixture");
    });
    await expect(
      galleryRouter.createCaller(context(owner)).upload(uploadInput)
    ).rejects.toThrow();
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(db.tx.insert).not.toHaveBeenCalled();
  });
  it("exposes only the permission boolean and keeps public reads behind their existing access check", async () => {
    mocks.getAdminMemorialById.mockResolvedValue(pending);
    await expect(
      galleryRouter.createCaller(context(other)).permissions({ memorialId: 42 })
    ).resolves.toEqual({ canManage: false });
    mocks.requireReadableMemorialById.mockRejectedValue(
      new Error("private fixture")
    );
    await expect(
      galleryRouter
        .createCaller(context(null))
        .listByMemorial({ memorialId: 42 })
    ).rejects.toThrow();
    expect(mocks.listMemorialGalleryPhotos).not.toHaveBeenCalled();
  });
});
