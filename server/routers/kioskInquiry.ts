import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createAdminAuditLog,
  createKioskInquiry,
  listKioskInquiries,
  markKioskInquiryNotified,
  updateKioskInquiryStatus,
} from "../db";
import { ENV } from "../_core/env";
import { getEmailConfigStatus, sendKioskInquiryEmail } from "../_core/email";
import {
  createPasswordAttemptLimiter,
  passwordAttemptKey,
} from "../_core/passwordAttemptLimiter";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { maskPhoneForAudit } from "../../shared/auditNotes";
import {
  KIOSK_INQUIRY_NAME_MAX,
  KIOSK_INQUIRY_STATUSES,
  normalizeKoreanPhone,
} from "../../shared/kioskInquiry";

/**
 * 키오스크 "문의" (2026-09-16).
 * 관람객이 전화번호를 남기면 (1) 표에 적고 (2) 업체 메일로 보낸다. 메일이 실패해도
 * 표에는 남아 관리자 화면에서 볼 수 있다. 한 기기에서 10분에 5번까지만 받는다.
 */
const inquiryLimiter = createPasswordAttemptLimiter({
  failureLimit: 5,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});

export const kioskInquiryRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        phone: z.string().trim().min(1).max(30),
        name: z.string().trim().max(KIOSK_INQUIRY_NAME_MAX).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = passwordAttemptKey(ctx.req, "kiosk-inquiry");
      const check = inquiryLimiter.check(key);
      if (!check.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "문의가 너무 자주 접수됐습니다. 잠시 후 다시 시도해 주세요.",
        });
      }

      const phone = normalizeKoreanPhone(input.phone);
      if (!phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "전화번호를 다시 확인해 주세요. 예: 010-1234-5678",
        });
      }
      const name = input.name?.trim() || null;

      // 접수 자체를 횟수로 센다 (비밀번호 재설정 요청과 같은 방식).
      inquiryLimiter.recordFailure(key);

      const id = await createKioskInquiry({ phone, name, source: "kiosk" });

      let notified = false;
      const to = ENV.inquiryNotifyEmail.trim();
      if (to && getEmailConfigStatus().enabled) {
        try {
          await sendKioskInquiryEmail({ to, phone, name, inquiryId: id });
          await markKioskInquiryNotified(id, null);
          notified = true;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "메일 발송 실패";
          console.error("[KioskInquiry] 문의 메일 발송 실패:", message);
          await markKioskInquiryNotified(id, message.slice(0, 300));
        }
      } else {
        console.warn(
          "[KioskInquiry] INQUIRY_NOTIFY_EMAIL 또는 SMTP 가 없어 메일을 보내지 않았습니다. 관리자 화면에서 확인하세요."
        );
      }

      await createAdminAuditLog({
        adminUserId: null,
        targetUserId: null,
        action: "kiosk_inquiry.create",
        note: `키오스크 문의 ${id} · ${maskPhoneForAudit(phone)}${notified ? " · 메일 발송" : " · 메일 미발송"}`,
      });

      return { success: true, notified } as const;
    }),

  adminList: adminProcedure.query(() => listKioskInquiries(300)),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(KIOSK_INQUIRY_STATUSES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateKioskInquiryStatus(input.id, input.status);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "문의를 찾을 수 없습니다.",
        });
      }
      await createAdminAuditLog({
        adminUserId: ctx.user.id,
        action: "kiosk_inquiry.status.update",
        beforeValue: updated.before,
        afterValue: input.status,
        note: `키오스크 문의 ${input.id} · ${maskPhoneForAudit(updated.phone)}`,
      });
      return { success: true } as const;
    }),
});
