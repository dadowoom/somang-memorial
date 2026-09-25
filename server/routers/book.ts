import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  canReadMemorial,
  createMemorialBook,
  createMemorialBookPage,
  deleteMemorialBook,
  deleteMemorialBookPage,
  getMemorialBookById,
  listMemorialBookPages,
  listMemorialBooks,
  updateMemorialBook,
  updateMemorialBookPage,
} from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { requireReadableMemorialById } from "./memorialAccess";
import { signMediaUrl, unsignMediaUrl } from "../_core/protectedMedia";

const nullableText = z.string().trim().nullable().optional();

/**
 * 추억책 사진 주소 (2026-09-25). 앨범 사진처럼, 비공개·작성 중 추모관의
 * 추억책 사진은 기한이 적힌 주소로만 내준다 (protectedMedia.ts).
 */
function bookPhotosFor(memorial: Parameters<typeof canReadMemorial>[0]) {
  const open = canReadMemorial(memorial, null);
  const url = (value: string | null) =>
    open || !value ? value : signMediaUrl(value);
  return <
    B extends { coverPhotoUrl: string | null },
    P extends { photoUrl: string | null },
  >(
    book: B,
    pages: P[]
  ) => ({
    ...book,
    coverPhotoUrl: url(book.coverPhotoUrl),
    pages: pages.map(page => ({ ...page, photoUrl: url(page.photoUrl) })),
  });
}

/** 화면이 받은 기한 주소를 그대로 보내도 DB 에는 원래 주소를 적는다. */
function storedUrl<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? unsignMediaUrl(value) : value) as T;
}

export const bookRouter = router({
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
      const withPhotos = bookPhotosFor(memorial);
      const books = await listMemorialBooks(input.memorialId);
      return Promise.all(
        books.map(async book =>
          withPhotos(book, await listMemorialBookPages(book.id))
        )
      );
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.number(),
        accessToken: z.string().trim().max(128).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const book = await getMemorialBookById(input.id);
      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "책을 찾을 수 없습니다.",
        });
      }
      const memorial = await requireReadableMemorialById({
        memorialId: book.memorialId,
        accessToken: input.accessToken,
        ctx,
      });
      return bookPhotosFor(memorial)(
        book,
        await listMemorialBookPages(book.id)
      );
    }),

  create: adminProcedure
    .input(
      z.object({
        memorialId: z.number(),
        title: z.string().trim().min(1).max(300),
        subtitle: z.string().trim().max(300).optional(),
        coverPhotoUrl: z.string().trim().optional(),
        coverPhotoKey: z.string().trim().optional(),
        publishedYear: z.string().trim().max(20).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createMemorialBook({
        memorialId: input.memorialId,
        title: input.title,
        subtitle: input.subtitle || null,
        coverPhotoUrl: storedUrl(input.coverPhotoUrl) || null,
        coverPhotoKey: input.coverPhotoKey || null,
        publishedYear: input.publishedYear || null,
        sortOrder: input.sortOrder ?? 0,
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().trim().min(1).max(300).optional(),
        subtitle: nullableText,
        coverPhotoUrl: nullableText,
        coverPhotoKey: nullableText,
        publishedYear: nullableText,
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMemorialBook(id, {
        ...data,
        coverPhotoUrl: storedUrl(data.coverPhotoUrl),
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMemorialBook(input.id);
      return { success: true };
    }),

  addPage: adminProcedure
    .input(
      z.object({
        bookId: z.number(),
        title: z.string().trim().max(300).optional(),
        content: z.string().trim().max(20000).optional(),
        photoUrl: z.string().trim().optional(),
        photoKey: z.string().trim().optional(),
        dateYear: z.number().min(1800).max(2200).optional(),
        dateMonth: z.number().min(1).max(12).optional(),
        dateDay: z.number().min(1).max(31).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createMemorialBookPage({
        bookId: input.bookId,
        title: input.title || null,
        content: input.content || null,
        photoUrl: storedUrl(input.photoUrl) || null,
        photoKey: input.photoKey || null,
        dateYear: input.dateYear || null,
        dateMonth: input.dateMonth || null,
        dateDay: input.dateDay || null,
        sortOrder: input.sortOrder ?? 0,
      });
      return { success: true };
    }),

  updatePage: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: nullableText,
        content: nullableText,
        photoUrl: nullableText,
        photoKey: nullableText,
        dateYear: z.number().min(1800).max(2200).nullable().optional(),
        dateMonth: z.number().min(1).max(12).nullable().optional(),
        dateDay: z.number().min(1).max(31).nullable().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMemorialBookPage(id, {
        ...data,
        photoUrl: storedUrl(data.photoUrl),
      });
      return { success: true };
    }),

  deletePage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMemorialBookPage(input.id);
      return { success: true };
    }),
});
