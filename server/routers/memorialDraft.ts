import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  deleteMemorialWritingDraft,
  getMemorialWritingDraft,
  saveMemorialWritingDraft,
} from "../db";
import {
  DRAFT_PAYLOAD_MAX_CHARS,
  sanitizeDraftPayload,
} from "../memorialDraft";

/**
 * 추모관 작성 중 자동 저장 (2026-09-23). 로그인한 본인의 저장본만 읽고 쓴다.
 * 기기(브라우저)에는 남기지 않으므로 공용 PC 에서 써도 다음 사람이 볼 수 없다.
 */
export const memorialDraftRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const draft = await getMemorialWritingDraft(ctx.user.id);
    if (!draft) return null;
    return {
      payload: draft.payload,
      updatedAt: draft.updatedAt.getTime(),
    };
  }),

  save: protectedProcedure
    .input(z.object({ payload: z.string().max(DRAFT_PAYLOAD_MAX_CHARS) }))
    .mutation(async ({ ctx, input }) => {
      const payload = sanitizeDraftPayload(input.payload, ctx.user.id);
      if (!payload) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "저장할 글의 형식을 확인하지 못했습니다.",
        });
      }
      await saveMemorialWritingDraft(ctx.user.id, payload);
      return { savedAt: Date.now() };
    }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteMemorialWritingDraft(ctx.user.id);
    return { success: true } as const;
  }),
});
