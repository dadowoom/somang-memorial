import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import {
  createIntermentRecordByAdmin,
  deleteIntermentRecordByAdmin,
  searchIntermentRecordsForAdmin,
  updateIntermentRecordByAdmin,
} from "../db";
import { cleanIntermentFields } from "../../shared/intermentAdmin";

/**
 * 관리자 화면에서 안장 기록 고치기 (2026-09-23). 관리자만.
 * 규칙(날짜 모양, 틀린 칸 안내): shared/intermentAdmin.ts
 */
const fieldsInput = z.object({
  name: z.string().max(120),
  role: z.string().max(80),
  affiliation: z.string().max(255),
  pastor: z.string().max(120),
  funeralChurch: z.string().max(160),
  birthDate: z.string().max(20),
  deathDate: z.string().max(20),
  deathAge: z.string().max(20),
  burialPlace: z.string().max(255),
  burialDate: z.string().max(20),
});

function cleanOrThrow(input: z.infer<typeof fieldsInput>) {
  const { value, errors } = cleanIntermentFields(input);
  if (!value) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: Object.values(errors).join(" "),
    });
  }
  return value;
}

export const intermentAdminRouter = router({
  search: adminProcedure
    .input(z.object({ keyword: z.string().trim().min(1).max(60) }))
    .query(({ input }) => searchIntermentRecordsForAdmin(input.keyword)),

  update: adminProcedure
    .input(z.object({ id: z.number().int().positive(), fields: fieldsInput }))
    .mutation(async ({ ctx, input }) => {
      const result = await updateIntermentRecordByAdmin(
        input.id,
        cleanOrThrow(input.fields),
        { adminUserId: ctx.user.id }
      );
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "안장 기록을 찾을 수 없습니다.",
        });
      }
      return result;
    }),

  create: adminProcedure
    .input(z.object({ fields: fieldsInput }))
    .mutation(async ({ ctx, input }) => {
      const id = await createIntermentRecordByAdmin(
        cleanOrThrow(input.fields),
        {
          adminUserId: ctx.user.id,
        }
      );
      return { id };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteIntermentRecordByAdmin(input.id, {
        adminUserId: ctx.user.id,
      });
      if (!result.ok) {
        throw new TRPCError(
          result.reason === "linked"
            ? {
                code: "PRECONDITION_FAILED",
                message:
                  "이 기록으로 만든 추모관이 있어 지울 수 없습니다. 성함이나 날짜가 틀렸다면 ‘고치기’를 써 주세요.",
              }
            : { code: "NOT_FOUND", message: "안장 기록을 찾을 수 없습니다." }
        );
      }
      return { success: true } as const;
    }),
});
