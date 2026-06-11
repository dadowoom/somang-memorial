import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "../drizzle/schema";
import {
  createMemorial,
  createMemorialLetter,
  createAdminAuditLog,
  createLocalUser,
  createMemorialReminderSubscription,
  canUserReadMemorial,
  countAdminUsers,
  getAdminUserById,
  getAdminMemorialById,
  getAdminMemorialBySlug,
  getEditableMemorialBySlug,
  getUserByEmail,
  getMemorialFamilyRoomStatus,
  getMemorialAccessStatus,
  getPublicMemorialBySlug,
  hashMemorialAccessPassword,
  listAdminMemorials,
  listAdminMemorialLetters,
  listAdminReminderSubscriptions,
  listAdminAuditLogs,
  listAdminUsers,
  listUserMemorials,
  listMemorialLetters,
  listPublicMemorials,
  listRecentMemorialLetters,
  normalizeEmail,
  searchPublicMemorials,
  updateMemorialLetterStatus,
  updateMemorial,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateReminderSubscriptionStatus,
  upsertUser,
  verifyUserPassword,
  verifyMemorialAccessPassword,
  verifyMemorialFamilyRoomPassword,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import {
  getSmsConfigStatus,
  sendReminderConfirmationSms,
  sendSms,
} from "./_core/sms";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { bookRouter } from "./routers/book";
import { galleryRouter } from "./routers/gallery";
import { uploadRouter } from "./routers/upload";
import { videoRouter } from "./routers/video";

const memorialCreateInput = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(80),
  birthDate: z.string().trim().min(1).max(20),
  deathDate: z.string().trim().min(1).max(20),
  church: z.string().trim().max(160).default("소망교회"),
  familyContact: z.string().trim().max(120).optional(),
  familyPhone: z.string().trim().max(80).optional(),
  slug: z.string().trim().max(120).optional(),
  verse: z.string().trim().max(1000).optional(),
  verseRef: z.string().trim().max(120).optional(),
  summary: z.string().trim().min(1).max(255),
  story: z.string().trim().min(1).max(10000),
  servicePlace: z.string().trim().max(255).optional(),
  serviceTime: z.string().trim().max(40).optional(),
  memorialDay: z.string().trim().max(40).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  accessPassword: z.string().trim().max(80).optional(),
  managerMemo: z.string().trim().max(2000).optional(),
  timeline: z
    .array(
      z.object({
        year: z.string().trim().max(20),
        title: z.string().trim().max(160),
        description: z.string().trim().max(1000),
      })
    )
    .max(30)
    .default([]),
});

const letterCreateInput = z
  .object({
    memorialSlug: z.string().trim().min(1).max(120).optional(),
    accessToken: z.string().trim().max(128).optional(),
    recipientName: z.string().trim().min(1).max(120).optional(),
    recipientRole: z.string().trim().max(80).optional(),
    author: z.string().trim().min(1).max(80),
    content: z.string().trim().min(1).max(2000),
  })
  .superRefine((value, ctx) => {
    if (value.memorialSlug || value.recipientName) return;
    ctx.addIssue({
      code: "custom",
      path: ["recipientName"],
      message: "받는 분을 입력해주세요.",
    });
  });

const familyRoomVerifyInput = z.object({
  memorialSlug: z.string().trim().min(1).max(120),
  password: z.string().trim().min(1).max(100),
});

const reminderSubscribeInput = z.object({
  memorialSlug: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^[0-9\-\s+()]+$/, "휴대폰 번호 형식으로 입력해주세요."),
  consent: z.literal(true),
});

const adminLetterStatusInput = z.object({
  id: z.number(),
  status: z.enum(["published", "hidden"]),
});

const adminReminderStatusInput = z.object({
  id: z.number(),
  status: z.enum(["active", "cancelled"]),
});

const adminSmsTestInput = z.object({
  phone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^[0-9\-\s+()]+$/, "휴대폰 번호 형식으로 입력해주세요."),
});

const adminUserRoleInput = z.object({
  id: z.number(),
  role: z.enum(["user", "admin"]),
});

const adminUserStatusInput = z.object({
  id: z.number(),
  approvalStatus: z.enum(["approved", "rejected"]),
});

const authSignupInput = z.object({
  name: z.string().trim().min(2, "성함을 입력해주세요.").max(80),
  email: z.string().trim().email("이메일 형식으로 입력해주세요.").max(320),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9\-\s+()]*$/, "휴대폰 번호 형식으로 입력해주세요.")
    .optional(),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해주세요.").max(100),
});

const authLoginInput = z.object({
  email: z.string().trim().email("이메일 형식으로 입력해주세요.").max(320),
  password: z.string().min(1, "비밀번호를 입력해주세요.").max(100),
});

const textDisplaySizeSchema = z.enum(["auto", "small", "normal", "large"]);

const memorialUpdateInput = z.object({
  id: z.number(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(80).optional(),
  birthDate: z.string().trim().min(1).max(20).optional(),
  deathDate: z.string().trim().min(1).max(20).optional(),
  church: z.string().trim().min(1).max(160).optional(),
  familyContact: z.string().trim().max(120).nullable().optional(),
  familyPhone: z.string().trim().max(80).nullable().optional(),
  verse: z.string().trim().max(1000).nullable().optional(),
  verseRef: z.string().trim().max(120).nullable().optional(),
  summary: z.string().trim().min(1).max(255).optional(),
  summaryDisplaySize: textDisplaySizeSchema.optional(),
  story: z.string().trim().min(1).max(10000).optional(),
  storyDisplaySize: textDisplaySizeSchema.optional(),
  servicePlace: z.string().trim().max(255).nullable().optional(),
  serviceTime: z.string().trim().max(40).nullable().optional(),
  memorialDay: z.string().trim().max(40).nullable().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  accessPassword: z.string().trim().max(80).optional(),
  status: z.enum(["published", "private"]).optional(),
  managerMemo: z.string().trim().max(2000).nullable().optional(),
  timeline: z
    .array(
      z.object({
        year: z.string().trim().max(20),
        title: z.string().trim().max(160),
        description: z.string().trim().max(1000),
      })
    )
    .max(30)
    .optional(),
});

const withLetterLinks = <T extends { memorialSlug: string | null }>(
  letter: T
) => ({
  ...letter,
  memorialHref: letter.memorialSlug ? `/memorial/${letter.memorialSlug}` : null,
});

const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  loginMethod: user.loginMethod,
  role: user.role,
  approvalStatus: user.approvalStatus,
  approvedAt: user.approvedAt,
  createdAt: user.createdAt,
  lastSignedIn: user.lastSignedIn,
});

const parseTimeline = (timelineJson?: string | null) => {
  if (!timelineJson) return [];

  try {
    return JSON.parse(timelineJson) as Array<{
      year: string;
      title: string;
      description: string;
    }>;
  } catch {
    return [];
  }
};

const buildMemorialUpdateData = (
  input: z.infer<typeof memorialUpdateInput>,
  existing: { accessPasswordHash: string | null }
) => {
  const {
    id: _id,
    accessPassword,
    timeline,
    visibility,
    status,
    ...data
  } = input;
  const updateData: Parameters<typeof updateMemorial>[1] = {
    ...data,
  };

  if (visibility) {
    updateData.visibility = visibility;
    updateData.status = visibility === "private" ? "private" : "published";
  } else if (status) {
    updateData.status = status;
  }

  if (timeline) {
    const cleanedTimeline = timeline.filter(
      item => item.year || item.title || item.description
    );
    updateData.timelineJson = JSON.stringify(cleanedTimeline);
  }

  if (visibility === "public") {
    updateData.accessPasswordHash = null;
  } else if (accessPassword?.trim()) {
    updateData.accessPasswordHash = hashMemorialAccessPassword(accessPassword);
  } else if (visibility === "private" && !existing.accessPasswordHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "비공개 추모관은 입장 비밀번호가 필요합니다.",
    });
  }

  return updateData;
};

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user ? toPublicUser(opts.ctx.user) : null
    ),
    signup: publicProcedure
      .input(authSignupInput)
      .mutation(async ({ ctx, input }) => {
        const created = await createLocalUser({
          name: input.name,
          email: input.email,
          phone: input.phone,
          password: input.password,
        });

        if (!created) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "이미 가입된 이메일입니다.",
          });
        }

        if (created.approvalStatus === "approved") {
          const sessionToken = await sdk.createSessionToken(created.openId, {
            name: created.name || normalizeEmail(input.email),
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
        }

        return {
          user: toPublicUser(created),
          approvalStatus: created.approvalStatus,
          firstAdmin: created.role === "admin",
        };
      }),
    login: publicProcedure
      .input(authLoginInput)
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (
          !user?.passwordHash ||
          !verifyUserPassword(input.password, user.passwordHash)
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "이메일 또는 비밀번호가 맞지 않습니다.",
          });
        }

        if (user.approvalStatus === "rejected") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비활성화된 계정입니다.",
          });
        }

        const signedInAt = new Date();
        await upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || normalizeEmail(input.email),
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          user: toPublicUser({
            ...user,
            lastSignedIn: signedInAt,
          }),
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  memorial: router({
    adminList: adminProcedure.query(async () => {
      const memorials = await listAdminMemorials();
      return memorials.map(memorial => ({
        ...memorial,
        isPrivate: memorial.visibility === "private",
        href: `/memorial/${memorial.slug}`,
        editHref: `/admin/memorials/${memorial.slug}/edit`,
      }));
    }),

    adminBySlug: adminProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(120) }))
      .query(async ({ input }) => {
        const memorial = await getAdminMemorialBySlug(input.slug);
        if (!memorial) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        const { accessPasswordHash, ...safeMemorial } = memorial;
        return {
          ...safeMemorial,
          timeline: parseTimeline(memorial.timelineJson),
          hasAccessPassword: Boolean(accessPasswordHash),
          href: `/memorial/${memorial.slug}`,
        };
      }),

    mine: protectedProcedure.query(async ({ ctx }) => {
      const memorials = await listUserMemorials(ctx.user.id);
      return memorials.map(memorial => ({
        ...memorial,
        isPrivate: memorial.visibility === "private",
        href: `/memorial/${memorial.slug}`,
        editHref: `/my/memorials/${memorial.slug}/edit`,
      }));
    }),

    editableBySlug: protectedProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(120) }))
      .query(async ({ ctx, input }) => {
        const memorial = await getEditableMemorialBySlug({
          slug: input.slug,
          userId: ctx.user.id,
          isAdmin: ctx.user.role === "admin",
        });

        if (!memorial) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "수정할 추모관을 찾을 수 없습니다.",
          });
        }

        const { accessPasswordHash, ...safeMemorial } = memorial;
        return {
          ...safeMemorial,
          timeline: parseTimeline(memorial.timelineJson),
          hasAccessPassword: Boolean(accessPasswordHash),
          href: `/memorial/${memorial.slug}`,
          editHref:
            ctx.user.role === "admin"
              ? `/admin/memorials/${memorial.slug}/edit`
              : `/my/memorials/${memorial.slug}/edit`,
        };
      }),

    list: publicProcedure.query(async () => {
      const memorials = await listPublicMemorials();

      return memorials.map(memorial => ({
        ...memorial,
        href: `/memorial/${memorial.slug}`,
      }));
    }),

    search: publicProcedure
      .input(z.object({ keyword: z.string().trim().min(2).max(80) }))
      .query(async ({ input }) => {
        const memorials = await searchPublicMemorials(input.keyword);

        return memorials.map(memorial => ({
          ...memorial,
          isPrivate: memorial.visibility === "private",
          href: `/memorial/${memorial.slug}`,
        }));
      }),

    accessStatus: publicProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(120) }))
      .query(async ({ input }) => {
        const status = await getMemorialAccessStatus(input.slug);
        if (!status) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        return status;
      }),

    verifyAccess: publicProcedure
      .input(
        z.object({
          slug: z.string().trim().min(1).max(120),
          password: z.string().trim().min(1).max(80),
        })
      )
      .mutation(async ({ input }) => {
        const access = await verifyMemorialAccessPassword(input);
        if (access === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        if (access === false) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        return access;
      }),

    bySlug: publicProcedure
      .input(
        z.object({
          slug: z.string().trim().min(1).max(120),
          accessToken: z.string().trim().max(128).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const memorial = await getPublicMemorialBySlug(input.slug);
        if (!memorial) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        if (!canUserReadMemorial(memorial, input.accessToken, ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비공개 추모관입니다.",
          });
        }

        const {
          accessPasswordHash,
          createdByUserId: _ownerId,
          ...safeMemorial
        } = memorial;

        return {
          ...safeMemorial,
          timeline: parseTimeline(memorial.timelineJson),
          href: `/memorial/${safeMemorial.slug}`,
        };
      }),

    create: protectedProcedure
      .input(memorialCreateInput)
      .mutation(async ({ ctx, input }) => {
        if (input.visibility === "private" && !input.accessPassword?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "비공개 추모관은 입장 비밀번호가 필요합니다.",
          });
        }

        const timeline = input.timeline.filter(
          item => item.year || item.title || item.description
        );

        const created = await createMemorial({
          name: input.name,
          role: input.role,
          birthDate: input.birthDate,
          deathDate: input.deathDate,
          church: input.church || "소망교회",
          familyContact: input.familyContact || null,
          familyPhone: input.familyPhone || null,
          createdByUserId: ctx.user.id,
          slug: input.slug || input.name,
          verse: input.verse || null,
          verseRef: input.verseRef || null,
          summary: input.summary,
          story: input.story,
          servicePlace: input.servicePlace || null,
          serviceTime: input.serviceTime || null,
          memorialDay: input.memorialDay || null,
          visibility: input.visibility,
          accessPasswordHash:
            input.visibility === "private" && input.accessPassword
              ? hashMemorialAccessPassword(input.accessPassword)
              : null,
          status: "published",
          timelineJson: JSON.stringify(timeline),
          managerMemo: input.managerMemo || null,
        });

        return {
          id: created.id,
          slug: created.slug,
          status: created.status,
          href: `/memorial/${created.slug}`,
          editHref: `/my/memorials/${created.slug}/edit`,
        };
      }),

    update: adminProcedure
      .input(memorialUpdateInput)
      .mutation(async ({ input }) => {
        const existing = await getAdminMemorialById(input.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        await updateMemorial(
          input.id,
          buildMemorialUpdateData(input, existing)
        );
        return { success: true };
      }),

    updateEditable: protectedProcedure
      .input(memorialUpdateInput)
      .mutation(async ({ ctx, input }) => {
        const existing = await getAdminMemorialById(input.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        if (
          ctx.user.role !== "admin" &&
          existing.createdByUserId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "수정 권한이 없습니다.",
          });
        }

        await updateMemorial(
          input.id,
          buildMemorialUpdateData(input, existing)
        );
        return { success: true };
      }),
  }),

  letter: router({
    adminList: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(300) }))
      .query(async ({ input }) => listAdminMemorialLetters(input.limit)),

    updateStatus: adminProcedure
      .input(adminLetterStatusInput)
      .mutation(async ({ input }) => {
        await updateMemorialLetterStatus(input.id, input.status);
        return { success: true };
      }),

    recent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(100) }))
      .query(async ({ input }) => {
        const letters = await listRecentMemorialLetters(input.limit);
        return letters.map(withLetterLinks);
      }),

    byMemorial: publicProcedure
      .input(
        z.object({
          memorialSlug: z.string().trim().min(1).max(120),
          accessToken: z.string().trim().max(128).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const memorial = await getPublicMemorialBySlug(input.memorialSlug);
        if (!memorial) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }
        if (!canUserReadMemorial(memorial, input.accessToken, ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비공개 추모관입니다.",
          });
        }

        const letters = await listMemorialLetters(input.memorialSlug);
        return letters.map(withLetterLinks);
      }),

    create: publicProcedure
      .input(letterCreateInput)
      .mutation(async ({ ctx, input }) => {
        if (input.memorialSlug) {
          const memorial = await getPublicMemorialBySlug(input.memorialSlug);
          if (!memorial) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "추모관을 찾을 수 없습니다.",
            });
          }
          if (!canUserReadMemorial(memorial, input.accessToken, ctx.user)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "비공개 추모관입니다.",
            });
          }
        }

        const created = await createMemorialLetter(input);
        if (!created) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: input.memorialSlug
              ? "추모관을 찾을 수 없습니다."
              : "편지를 남길 수 없습니다.",
          });
        }

        return withLetterLinks(created);
      }),
  }),

  familyRoom: router({
    status: publicProcedure
      .input(z.object({ memorialSlug: z.string().trim().min(1).max(120) }))
      .query(async ({ input }) => {
        const status = await getMemorialFamilyRoomStatus(input.memorialSlug);
        if (!status) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        return status;
      }),

    verify: publicProcedure
      .input(familyRoomVerifyInput)
      .mutation(async ({ input }) => {
        const room = await verifyMemorialFamilyRoomPassword(
          input.memorialSlug,
          input.password
        );

        if (room === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "가족관을 찾을 수 없습니다.",
          });
        }

        if (room === false) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        return room;
      }),
  }),

  admin: router({
    users: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).default(500) }))
      .query(async ({ input }) => listAdminUsers(input.limit)),

    auditLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(300).default(100) }))
      .query(async ({ input }) => listAdminAuditLogs(input.limit)),

    updateUserRole: adminProcedure
      .input(adminUserRoleInput)
      .mutation(async ({ ctx, input }) => {
        const targetUser = await getAdminUserById(input.id);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "회원을 찾을 수 없습니다.",
          });
        }

        if (ctx.user.id === input.id && input.role !== "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "자기 자신의 관리자 권한은 해제할 수 없습니다.",
          });
        }

        if (input.role !== "admin") {
          const adminCount = await countAdminUsers();
          if (adminCount <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "마지막 관리자 권한은 해제할 수 없습니다.",
            });
          }
        }

        if (targetUser.role !== input.role) {
          await updateAdminUserRole(input.id, input.role);
          await createAdminAuditLog({
            adminUserId: ctx.user.id,
            targetUserId: input.id,
            action: "user.role.update",
            beforeValue: targetUser.role,
            afterValue: input.role,
            note: `${targetUser.name || targetUser.email || "회원"} 권한 변경`,
          });
        }

        return { success: true };
      }),

    updateUserStatus: adminProcedure
      .input(adminUserStatusInput)
      .mutation(async ({ ctx, input }) => {
        const targetUser = await getAdminUserById(input.id);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "회원을 찾을 수 없습니다.",
          });
        }

        if (ctx.user.id === input.id && input.approvalStatus !== "approved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "자기 자신의 계정은 비활성화할 수 없습니다.",
          });
        }

        if (targetUser.approvalStatus !== input.approvalStatus) {
          await updateAdminUserStatus(input.id, input.approvalStatus);
          await createAdminAuditLog({
            adminUserId: ctx.user.id,
            targetUserId: input.id,
            action: "user.status.update",
            beforeValue: targetUser.approvalStatus,
            afterValue: input.approvalStatus,
            note: `${targetUser.name || targetUser.email || "회원"} 상태 변경`,
          });
        }

        return { success: true };
      }),
  }),

  reminder: router({
    smsStatus: adminProcedure.query(() => getSmsConfigStatus()),

    testSend: adminProcedure
      .input(adminSmsTestInput)
      .mutation(async ({ input }) => {
        await sendSms({
          to: input.phone,
          text: [
            "[소망이 있는 곳]",
            "추도일 알림 문자 연동 테스트입니다.",
            "이 문자를 받으셨다면 SOLAPI 발송 설정이 정상입니다.",
          ].join("\n"),
        });

        return { success: true };
      }),

    adminList: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(300) }))
      .query(async ({ input }) => listAdminReminderSubscriptions(input.limit)),

    updateStatus: adminProcedure
      .input(adminReminderStatusInput)
      .mutation(async ({ input }) => {
        await updateReminderSubscriptionStatus(input.id, input.status);
        return { success: true };
      }),

    subscribe: publicProcedure
      .input(reminderSubscribeInput)
      .mutation(async ({ input }) => {
        const subscribed = await createMemorialReminderSubscription({
          memorialSlug: input.memorialSlug,
          phone: input.phone,
        });

        if (!subscribed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        try {
          await sendReminderConfirmationSms({
            to: subscribed.phone,
            memorialName: subscribed.memorialName,
            memorialDay: subscribed.memorialDay,
            memorialSlug: subscribed.memorialSlug,
          });

          return {
            ...subscribed,
            confirmationSent: true,
            confirmationMessage: "확인 문자를 발송했습니다.",
          };
        } catch (error) {
          return {
            ...subscribed,
            confirmationSent: false,
            confirmationMessage:
              error instanceof Error
                ? error.message
                : "확인 문자 발송은 처리되지 않았습니다.",
          };
        }
      }),
  }),

  gallery: galleryRouter,
  video: videoRouter,
  book: bookRouter,
  upload: uploadRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
