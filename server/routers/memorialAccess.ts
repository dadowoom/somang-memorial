import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import {
  canManageMemorialGallery,
  type GalleryMemorial,
  type GalleryUser,
} from "../../shared/memorialGalleryPermissions";
import {
  canUserReadMemorialWithFamily,
  getAdminMemorialById,
  isMemorialFamilyMember,
} from "../db";

export async function requireReadableMemorialById(input: {
  memorialId: number;
  accessToken?: string | null;
  ctx: TrpcContext;
}) {
  const memorial = await getAdminMemorialById(input.memorialId);
  if (!memorial) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "추모관을 찾을 수 없습니다.",
    });
  }

  // 가족 초대로 함께 관리하는 가족도 비공개·확인 대기 추모관을 볼 수 있다.
  if (
    !(await canUserReadMemorialWithFamily(
      memorial,
      input.accessToken,
      input.ctx.user
    ))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "비공개 추모관입니다.",
    });
  }

  return memorial;
}

/**
 * 추모관 사진·영상을 고칠 수 있는 사람인지 (관리자, 추모관 주인, 초대받은 가족).
 * 사진첩과 같은 규칙(shared/memorialGalleryPermissions.ts)을 쓴다.
 */
export async function canUserManageMemorialMedia(
  user: GalleryUser | undefined,
  memorial: GalleryMemorial & { id: number }
) {
  if (!user) return false;
  const isFamilyMember =
    user.role !== "admin" &&
    memorial.createdByUserId !== user.id &&
    (await isMemorialFamilyMember(memorial.id, user.id));
  return canManageMemorialGallery(memorial, user, isFamilyMember);
}

/**
 * 영상을 고치기 전에 부른다 (2026-09-16). 전에는 관리자만 영상을 넣을 수 있어
 * 가족에게는 유튜브 주소 넣는 칸이 아예 보이지 않았다.
 */
export async function requireMemorialMediaEditor(
  user: GalleryUser | undefined,
  memorialId: number
) {
  const memorial = await getAdminMemorialById(memorialId);
  if (!memorial) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "추모관을 찾을 수 없습니다.",
    });
  }

  if (!(await canUserManageMemorialMedia(user, memorial))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "영상 변경 권한이 없습니다. 추모관을 만든 가족, 초대받은 가족, 관리자만 영상을 바꿀 수 있습니다.",
    });
  }

  return memorial;
}
