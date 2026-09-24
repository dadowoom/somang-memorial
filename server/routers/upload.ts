import { z } from "zod";
import { nanoid } from "nanoid";
import { adminProcedure, router } from "../_core/trpc";
import { decodeImageDataUrl } from "../_core/imageUpload";
import { storagePut } from "../storage";
import { isBookMediaFolder, signMediaUrl } from "../_core/protectedMedia";

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
      // 저장할 때 이름 뒤에 글자가 붙으므로, 실제로 저장된 이름을 돌려준다.
      const stored = await storagePut(key, buffer, mimeType);
      // 추억책 사진은 책에 넣기 전까지 그냥 주소로 보이지 않는다. 미리보기는
      // 기한이 적힌 주소로 보여 주고, 저장할 때 원래 주소로 되돌린다 (2026-09-25).
      const url = isBookMediaFolder(input.folder)
        ? signMediaUrl(stored.url)
        : stored.url;
      return { url, key: stored.key };
    }),
});
