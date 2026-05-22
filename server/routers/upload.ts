import { z } from "zod";
import { nanoid } from "nanoid";
import { adminProcedure, router } from "../_core/trpc";
import { decodeImageDataUrl } from "../_core/imageUpload";
import { storagePut } from "../storage";

const uploadFolderSchema = z.enum([
  "uploads",
  "gallery",
  "book-pages",
  "book-covers",
]);

export const uploadRouter = router({
  image: adminProcedure
    .input(
      z.object({
        dataUrl: z.string(),
        fileName: z.string(),
        folder: uploadFolderSchema.default("uploads"),
      })
    )
    .mutation(async ({ input }) => {
      const { buffer, mimeType, ext } = decodeImageDataUrl(input.dataUrl);
      const key = `${input.folder}/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      return { url, key };
    }),
});
