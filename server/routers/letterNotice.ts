import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getLetterNoticeOptOut, setLetterNoticeOptOut } from "../db";

/**
 * 새 편지 알림톡 받기 설정 (2026-09-23). 기본은 받는다. 로그인한 본인 것만.
 * 알림톡의 "알림 설정" 버튼이 내 계정 화면을 연다.
 */
export const letterNoticeRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => ({
    enabled: !(await getLetterNoticeOptOut(ctx.user.id)),
  })),

  set: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setLetterNoticeOptOut(ctx.user.id, !input.enabled);
      return { enabled: input.enabled };
    }),
});
