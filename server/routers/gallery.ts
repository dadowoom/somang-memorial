import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createMemorialGalleryPhoto,
  deleteMemorialGalleryPhoto,
  listMemorialGalleryPhotos,
  setRepresentativeMemorialPhoto,
  updateMemorialGalleryPhoto,
} from "../db";
import { decodeImageDataUrl } from "../_core/imageUpload";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

export const galleryRouter = router({
  listByMemorial: publicProcedure
    .input(z.object({ memorialId: z.number() }))
    .query(({ input }) => listMemorialGalleryPhotos(input.memorialId)),

  upload: adminProcedure
    .input(
      z.object({
        memorialId: z.number(),
        dataUrl: z.string(),
        fileName: z.string(),
        caption: z.string().max(500).optional(),
        year: z.string().max(20).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { buffer, mimeType, ext } = decodeImageDataUrl(input.dataUrl);
      const key = `gallery/${input.memorialId}/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      await createMemorialGalleryPhoto({
        memorialId: input.memorialId,
        photoUrl: url,
        photoKey: key,
        caption: input.caption || null,
        year: input.year || null,
        sortOrder: input.sortOrder ?? 0,
        isRepresentative: 0,
      });

      return { success: true, url, key };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        caption: z.string().max(500).nullable().optional(),
        year: z.string().max(20).nullable().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMemorialGalleryPhoto(id, data);
      return { success: true };
    }),

  setRepresentative: adminProcedure
    .input(z.object({ memorialId: z.number(), id: z.number() }))
    .mutation(async ({ input }) => {
      await setRepresentativeMemorialPhoto(input.memorialId, input.id);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMemorialGalleryPhoto(input.id);
      return { success: true };
    }),
});
