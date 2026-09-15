import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import {
  createAdminAuditLog,
  createKioskPoster,
  deleteKioskPoster,
  getKioskPosterById,
  listActiveKioskPosters,
  listAllKioskPosters,
  updateKioskPoster,
} from "../db";
import { decodeImageDataUrl } from "../_core/imageUpload";
import { storagePut } from "../storage";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

// 한 장을 너무 짧게/길게 두면 대기 화면이 쓸모없어진다. 사이 값만 받는다.
const MIN_DISPLAY_SECONDS = 3;
const MAX_DISPLAY_SECONDS = 120;
const DEFAULT_DISPLAY_SECONDS = 8;

const displaySecondsSchema = z
  .number()
  .int()
  .min(MIN_DISPLAY_SECONDS)
  .max(MAX_DISPLAY_SECONDS);

function auditValue(poster: {
  isActive: number;
  sortOrder: number;
  displaySeconds: number;
}) {
  const state = poster.isActive === 1 ? "사용" : "중지";
  return `${state} · 순서 ${poster.sortOrder} · ${poster.displaySeconds}초`.slice(
    0,
    120
  );
}

export const kioskPosterRouter = router({
  // 키오스크 대기 화면이 읽는다. 사용 중인 포스터만 정해진 순서로 내려보낸다.
  list: publicProcedure.query(async () => {
    const posters = await listActiveKioskPosters();
    return posters.map(poster => ({
      id: poster.id,
      imageUrl: poster.imageUrl,
      caption: poster.caption,
      displaySeconds: poster.displaySeconds,
    }));
  }),

  adminList: adminProcedure.query(() => listAllKioskPosters()),

  create: adminProcedure
    .input(
      z.object({
        dataUrl: z.string(),
        fileName: z.string().max(260),
        caption: z.string().max(200).optional(),
        displaySeconds: displaySecondsSchema.default(DEFAULT_DISPLAY_SECONDS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 추모관 사진과 같은 통로다. 형식을 확인하고 위치·기기 정보를 지운다.
      const { buffer, mimeType, ext } = decodeImageDataUrl(input.dataUrl);
      const key = `kiosk-posters/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      const existing = await listAllKioskPosters();
      const sortOrder =
        existing.reduce((max, poster) => Math.max(max, poster.sortOrder), 0) +
        1;

      await createKioskPoster({
        imageUrl: url,
        imageKey: key,
        caption: input.caption || null,
        displaySeconds: input.displaySeconds,
        sortOrder,
        isActive: 1,
      });

      await createAdminAuditLog({
        adminUserId: ctx.user.id,
        action: "kioskPoster.create",
        afterValue: key.slice(0, 120),
        note: `키오스크 광고 추가 · 순서 ${sortOrder} · ${input.displaySeconds}초`,
      });

      return { success: true, url };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        caption: z.string().max(200).nullable().optional(),
        displaySeconds: displaySecondsSchema.optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const poster = await getKioskPosterById(input.id);
      if (!poster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "키오스크 광고를 찾을 수 없습니다.",
        });
      }

      const changes: {
        caption?: string | null;
        displaySeconds?: number;
        isActive?: number;
        sortOrder?: number;
      } = {};
      if (input.caption !== undefined) changes.caption = input.caption;
      if (input.displaySeconds !== undefined) {
        changes.displaySeconds = input.displaySeconds;
      }
      if (input.isActive !== undefined) {
        changes.isActive = input.isActive ? 1 : 0;
      }
      if (input.sortOrder !== undefined) changes.sortOrder = input.sortOrder;

      await updateKioskPoster(input.id, changes);

      await createAdminAuditLog({
        adminUserId: ctx.user.id,
        action: "kioskPoster.update",
        beforeValue: auditValue(poster),
        afterValue: auditValue({
          isActive: changes.isActive ?? poster.isActive,
          sortOrder: changes.sortOrder ?? poster.sortOrder,
          displaySeconds: changes.displaySeconds ?? poster.displaySeconds,
        }),
        note: `키오스크 광고 ${input.id} 수정`,
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const poster = await getKioskPosterById(input.id);
      if (!poster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "키오스크 광고를 찾을 수 없습니다.",
        });
      }

      await deleteKioskPoster(input.id);

      await createAdminAuditLog({
        adminUserId: ctx.user.id,
        action: "kioskPoster.delete",
        beforeValue: auditValue(poster),
        note: `키오스크 광고 ${input.id} 삭제 · ${poster.imageKey}`.slice(
          0,
          500
        ),
      });

      return { success: true };
    }),
});
