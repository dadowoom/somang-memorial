import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  getAdminMemorialById,
  isMemorialFamilyMember,
  listMemorialGalleryPhotos,
} from "../db";
import { memorialGalleryPhotos } from "../../drizzle/schema";
import { canManageMemorialGallery } from "../../shared/memorialGalleryPermissions";
import { withGalleryEditor } from "../galleryEditing";
import { decodeImageDataUrl } from "../_core/imageUpload";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { requireReadableMemorialById } from "./memorialAccess";

export const galleryRouter = router({
  permissions: protectedProcedure
    .input(z.object({ memorialId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const memorial = await getAdminMemorialById(input.memorialId);
      // 주인도 관리자도 아니면 가족 초대로 함께 관리하는 가족인지 본다 (2026-09-13).
      const isFamilyMember =
        memorial !== null &&
        ctx.user.role !== "admin" &&
        memorial.createdByUserId !== ctx.user.id &&
        (await isMemorialFamilyMember(memorial.id, ctx.user.id));
      return {
        canManage: canManageMemorialGallery(memorial, ctx.user, isFamilyMember),
      };
    }),
  listByMemorial: publicProcedure
    .input(
      z.object({
        memorialId: z.number(),
        accessToken: z.string().trim().max(128).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireReadableMemorialById({
        memorialId: input.memorialId,
        accessToken: input.accessToken,
        ctx,
      });
      return listMemorialGalleryPhotos(input.memorialId);
    }),

  upload: protectedProcedure
    .input(
      z.object({
        memorialId: z.number(),
        dataUrl: z.string(),
        fileName: z.string(),
        caption: z.string().max(500).optional(),
        year: z.string().max(20).optional(),
        sortOrder: z.number().optional(),
        /**
         * "프로필 사진" 칸에서 올린 사진이면 true (2026-09-16). 전에 쓰던 프로필
         * 사진은 지우지 않고 앨범에 남긴다.
         */
        asProfile: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      withGalleryEditor(
        ctx.user,
        { memorialId: input.memorialId },
        async (tx, memorialId) => {
          const existing = await tx
            .select({ id: memorialGalleryPhotos.id })
            .from(memorialGalleryPhotos)
            .where(eq(memorialGalleryPhotos.memorialId, memorialId));
          if (ctx.user.role !== "admin" && existing.length >= 30) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "사진은 30장까지 준비할 수 있습니다. 더 필요한 경우 관리자에게 문의해 주세요.",
            });
          }
          const { buffer, mimeType, ext } = decodeImageDataUrl(input.dataUrl);
          const key = `gallery/${memorialId}/${nanoid()}.${ext}`;
          const { url } = await storagePut(key, buffer, mimeType);

          const asProfile = input.asProfile === true;
          if (asProfile) {
            await tx
              .update(memorialGalleryPhotos)
              .set({ isRepresentative: 0 })
              .where(eq(memorialGalleryPhotos.memorialId, memorialId));
          }

          // 프로필 사진은 "프로필 사진" 칸에서 올린 사진만 된다 (2026-09-16).
          // 전에는 첫 사진이 저절로 대표 사진이 되어, 앨범에 올린 사진이 말없이
          // 추모관 맨 위 사진으로 쓰였다.
          const [inserted] = await tx.insert(memorialGalleryPhotos).values({
            memorialId,
            photoUrl: url,
            photoKey: key,
            caption: input.caption || null,
            year: input.year || null,
            sortOrder: input.sortOrder ?? 0,
            isRepresentative: asProfile ? 1 : 0,
          });
          const id = Number(
            (inserted as { insertId?: number } | undefined)?.insertId ?? 0
          );

          return { success: true, url, key, id, asProfile };
        }
      )
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        caption: z.string().max(500).nullable().optional(),
        year: z.string().max(20).nullable().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      withGalleryEditor(
        ctx.user,
        { photoId: input.id },
        async (tx, memorialId) => {
          const { id, ...data } = input;
          await tx
            .update(memorialGalleryPhotos)
            .set(data)
            .where(
              and(
                eq(memorialGalleryPhotos.id, id),
                eq(memorialGalleryPhotos.memorialId, memorialId)
              )
            );
          return { success: true };
        }
      )
    ),

  setRepresentative: protectedProcedure
    .input(z.object({ memorialId: z.number(), id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      withGalleryEditor(
        ctx.user,
        { memorialId: input.memorialId, photoId: input.id },
        async (tx, memorialId) => {
          await tx
            .update(memorialGalleryPhotos)
            .set({ isRepresentative: 0 })
            .where(eq(memorialGalleryPhotos.memorialId, memorialId));
          await tx
            .update(memorialGalleryPhotos)
            .set({ isRepresentative: 1 })
            .where(
              and(
                eq(memorialGalleryPhotos.id, input.id),
                eq(memorialGalleryPhotos.memorialId, memorialId)
              )
            );
          return { success: true };
        }
      )
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      withGalleryEditor(
        ctx.user,
        { photoId: input.id },
        async (tx, memorialId) => {
          await tx
            .delete(memorialGalleryPhotos)
            .where(
              and(
                eq(memorialGalleryPhotos.id, input.id),
                eq(memorialGalleryPhotos.memorialId, memorialId)
              )
            );
          return { success: true };
        }
      )
    ),
});
