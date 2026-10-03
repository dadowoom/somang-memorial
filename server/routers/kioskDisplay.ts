import { z } from "zod";
import { createAdminAuditLog } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createPasswordAttemptLimiter,
  passwordAttemptKey,
} from "../_core/passwordAttemptLimiter";
import { kioskDisplayStore } from "../kioskDisplayStore";
import {
  KIOSK_BROWSER_SUMMARY_PATTERN,
  KIOSK_REPORT_UA_MAX,
  KIOSK_ROTATE_DIRECTIONS,
  KIOSK_ROTATE_REASONS,
  kioskDirectionLabel,
  type KioskDisplaySettings,
} from "../../shared/kioskDisplay";

/**
 * 키오스크 세로 고정 설정과 화면 상태 보고 (2026-10-03, shared/kioskDisplay.ts).
 * 설정은 키오스크가 처음 열 때와 몇 분마다 읽는다. 관리자가 바꾸면 재배포 없이
 * 따라간다.
 */

// 보고는 키오스크 한 대가 몇 분마다 한 번 보내는 것이다. 한 접속지에서 10분에
// 30번을 넘으면 조용히 버린다(저장은 메모리, 기기마다 마지막 1건뿐).
const reportLimiter = createPasswordAttemptLimiter({
  failureLimit: 30,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
  maxEntries: 2_000,
});

const dimension = z.number().int().min(0).max(20_000);

function auditValue(settings: KioskDisplaySettings) {
  return settings.portraitLock
    ? `켬 · ${kioskDirectionLabel(settings.direction)}`
    : `끔 · ${kioskDirectionLabel(settings.direction)}`;
}

export const kioskDisplayRouter = router({
  // 키오스크가 읽는다. 켬/끔과 방향만 내려보낸다.
  settings: publicProcedure.query(() => {
    const { portraitLock, direction } = kioskDisplayStore.getSettings();
    return { portraitLock, direction };
  }),

  report: publicProcedure
    .input(
      z.object({
        viewportWidth: dimension,
        viewportHeight: dimension,
        screenWidth: dimension,
        screenHeight: dimension,
        pixelRatio: z.number().min(0).max(16),
        rotation: z.enum(KIOSK_ROTATE_DIRECTIONS).nullable(),
        reason: z.enum(KIOSK_ROTATE_REASONS),
        frameReady: z.boolean().nullable().default(null),
        // 화면이 줄여 보낸 "Chrome 141 · Windows" 꼴만 받는다(아무 글이나 못 남기게).
        browser: z
          .string()
          .trim()
          .max(KIOSK_REPORT_UA_MAX)
          .regex(KIOSK_BROWSER_SUMMARY_PATTERN),
      })
    )
    .mutation(({ ctx, input }) => {
      const key = passwordAttemptKey(ctx.req, "kiosk-display-report");
      if (!reportLimiter.check(key).allowed) return { ok: false };
      reportLimiter.recordFailure(key);
      kioskDisplayStore.recordReport({
        ...input,
        pixelRatio: Math.round(input.pixelRatio * 100) / 100,
      });
      return { ok: true };
    }),

  adminGet: adminProcedure.query(() => ({
    settings: kioskDisplayStore.getSettings(),
    persisted: kioskDisplayStore.isPersisted(),
    reports: kioskDisplayStore.listReports(),
  })),

  adminUpdate: adminProcedure
    .input(
      z.object({
        portraitLock: z.boolean(),
        direction: z.enum(KIOSK_ROTATE_DIRECTIONS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const before = kioskDisplayStore.getSettings();
      // 관리 기록을 먼저 남긴다. 기록이 실패하면 설정도 바꾸지 않는다.
      // (파일 저장 실패는 관리자 화면에 빨간 글로 따로 보이고 서버 로그에 남는다.)
      await createAdminAuditLog({
        adminUserId: ctx.user.id,
        action: "kioskDisplay.update",
        beforeValue: auditValue(before),
        afterValue: auditValue(input),
        note: "키오스크 세로 고정 설정 변경",
      });
      const { settings, persisted } = kioskDisplayStore.saveSettings(input);
      return { settings, persisted };
    }),
});
