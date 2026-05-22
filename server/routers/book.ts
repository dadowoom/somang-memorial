import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
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

const nullableText = z.string().trim().nullable().optional();

export const bookRouter = router({
  listByMemorial: publicProcedure
    .input(z.object({ memorialId: z.number() }))
    .query(async ({ input }) => {
      const books = await listMemorialBooks(input.memorialId);
      return Promise.all(
        books.map(async book => ({
          ...book,
          pages: await listMemorialBookPages(book.id),
        }))
      );
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const book = await getMemorialBookById(input.id);
      if (!book) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "책을 찾을 수 없습니다.",
        });
      }
      return { ...book, pages: await listMemorialBookPages(book.id) };
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
        coverPhotoUrl: input.coverPhotoUrl || null,
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
      await updateMemorialBook(id, data);
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
        photoUrl: input.photoUrl || null,
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
      await updateMemorialBookPage(id, data);
      return { success: true };
    }),

  deletePage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMemorialBookPage(input.id);
      return { success: true };
    }),
});
