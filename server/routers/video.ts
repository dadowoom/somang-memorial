import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { GalleryUser } from "../../shared/memorialGalleryPermissions";
import { extractYoutubeVideoId } from "../../shared/youtubeId";
import {
  createMemorialVideo,
  deleteMemorialVideo,
  getMemorialVideoById,
  listMemorialVideos,
  updateMemorialVideo,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  canUserManageMemorialMedia,
  requireMemorialMediaEditor,
  requireReadableMemorialById,
} from "./memorialAccess";

/** 가족이 올릴 수 있는 영상 수. 관리자는 제한 없음 (사진 30장과 같은 방식). */
export const MEMBER_VIDEO_LIMIT = 20;
export const DEFAULT_VIDEO_TITLE = "추모 영상";

function requireYoutubeVideoId(input: string) {
  const youtubeVideoId = extractYoutubeVideoId(input);
  if (!youtubeVideoId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "유튜브 주소를 확인해 주세요. 유튜브에서 '공유' → '복사'로 얻은 주소를 붙여 넣으면 됩니다.",
    });
  }
  return youtubeVideoId;
}

async function requireEditableVideo(user: GalleryUser, id: number) {
  const video = await getMemorialVideoById(id);
  if (!video) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "영상을 찾을 수 없습니다.",
    });
  }
  await requireMemorialMediaEditor(user, video.memorialId);
  return video;
}

// 2026-09-16: 관리자만 쓰던 영상 넣기·고치기를 추모관 주인과 초대받은 가족도 쓴다
// (사진첩과 같은 규칙). 유튜브 주소를 통째로 붙여 넣어도 서버가 영상 번호를 골라낸다.
export const videoRouter = router({
  listByMemorial: publicProcedure
    .input(
      z.object({
        memorialId: z.number(),
        accessToken: z.string().trim().max(128).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const memorial = await requireReadableMemorialById({
        memorialId: input.memorialId,
        accessToken: input.accessToken,
        ctx,
      });
      const videos = await listMemorialVideos(input.memorialId);
      // 숨긴 영상은 고칠 수 있는 사람에게만 보인다.
      if (await canUserManageMemorialMedia(ctx.user, memorial)) return videos;
      return videos.filter(video => video.isVisible !== 0);
    }),

  create: protectedProcedure
    .input(
      z.object({
        memorialId: z.number().int().positive(),
        title: z.string().trim().max(300).optional(),
        description: z.string().trim().max(2000).optional(),
        youtubeVideoId: z
          .string()
          .trim()
          .min(1, "유튜브 주소를 붙여 넣어 주세요.")
          .max(500),
        isVisible: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireMemorialMediaEditor(ctx.user, input.memorialId);
      const youtubeVideoId = requireYoutubeVideoId(input.youtubeVideoId);
      const existing = await listMemorialVideos(input.memorialId);
      if (ctx.user.role !== "admin" && existing.length >= MEMBER_VIDEO_LIMIT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `영상은 ${MEMBER_VIDEO_LIMIT}개까지 올릴 수 있습니다. 더 필요하면 관리자에게 문의해 주세요.`,
        });
      }

      await createMemorialVideo({
        memorialId: input.memorialId,
        title: input.title || DEFAULT_VIDEO_TITLE,
        description: input.description || null,
        youtubeVideoId,
        isVisible: input.isVisible === false ? 0 : 1,
        sortOrder: input.sortOrder ?? existing.length,
      });
      return { success: true, youtubeVideoId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().trim().min(1).max(300).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        youtubeVideoId: z.string().trim().max(500).optional(),
        isVisible: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireEditableVideo(ctx.user, input.id);
      const { id, isVisible, youtubeVideoId, ...rest } = input;
      await updateMemorialVideo(id, {
        ...rest,
        ...(youtubeVideoId === undefined
          ? {}
          : { youtubeVideoId: requireYoutubeVideoId(youtubeVideoId) }),
        ...(isVisible === undefined ? {} : { isVisible: isVisible ? 1 : 0 }),
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireEditableVideo(ctx.user, input.id);
      await deleteMemorialVideo(input.id);
      return { success: true };
    }),
});
