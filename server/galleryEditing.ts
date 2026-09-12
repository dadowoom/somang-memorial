import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  memorialGalleryPhotos,
  memorials,
  type MemorialGalleryPhoto,
} from "../drizzle/schema";
import {
  canManageMemorialGallery,
  type GalleryUser,
} from "../shared/memorialGalleryPermissions";
import { getDb } from "./db";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type GalleryTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Lock the parent before editing so publication and member photo changes cannot cross. */
export async function withGalleryEditor<T>(
  user: GalleryUser,
  input: { memorialId?: number; photoId?: number },
  edit: (
    tx: GalleryTransaction,
    memorialId: number,
    photo?: MemorialGalleryPhoto
  ) => Promise<T>
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "잠시 후 다시 시도해 주세요.",
    });
  return db.transaction(async tx => {
    let memorialId = input.memorialId;
    if (memorialId === undefined && input.photoId !== undefined) {
      const [photo] = await tx
        .select()
        .from(memorialGalleryPhotos)
        .where(eq(memorialGalleryPhotos.id, input.photoId))
        .limit(1);
      memorialId = photo?.memorialId;
    }
    if (memorialId === undefined)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "사진을 찾을 수 없습니다.",
      });
    const [memorial] = await tx
      .select()
      .from(memorials)
      .where(eq(memorials.id, memorialId))
      .limit(1)
      .for("update");
    if (!canManageMemorialGallery(memorial ?? null, user)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "사진 변경 권한이 없습니다. 추모관을 만든 가족과 관리자만 사진을 바꿀 수 있습니다.",
      });
    }
    let photo: MemorialGalleryPhoto | undefined;
    if (input.photoId !== undefined) {
      [photo] = await tx
        .select()
        .from(memorialGalleryPhotos)
        .where(
          and(
            eq(memorialGalleryPhotos.id, input.photoId),
            eq(memorialGalleryPhotos.memorialId, memorialId)
          )
        )
        .limit(1)
        .for("update");
      if (!photo)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "이 추모관의 사진을 찾을 수 없습니다.",
        });
    }
    return edit(tx, memorialId, photo);
  });
}
