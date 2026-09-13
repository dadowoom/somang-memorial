import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  memorialFamilyMembers,
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
    // 주인도 관리자도 아니면, 같은 트랜잭션 안에서 함께 관리하는 가족인지 본다.
    // (가족 초대, 2026-09-13) 바깥에서 먼저 조회한 결과를 믿지 않는 이유는 위와 같다.
    let isFamilyMember = false;
    if (
      memorial &&
      user &&
      user.role !== "admin" &&
      memorial.createdByUserId !== user.id
    ) {
      const [membership] = await tx
        .select({ id: memorialFamilyMembers.id })
        .from(memorialFamilyMembers)
        .where(
          and(
            eq(memorialFamilyMembers.memorialId, memorial.id),
            eq(memorialFamilyMembers.userId, user.id)
          )
        )
        .limit(1);
      isFamilyMember = Boolean(membership);
    }
    if (!canManageMemorialGallery(memorial ?? null, user, isFamilyMember)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "사진 변경 권한이 없습니다. 추모관을 만든 가족, 초대받은 가족, 관리자만 사진을 바꿀 수 있습니다.",
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
