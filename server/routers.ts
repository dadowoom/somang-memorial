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
  getUserByLocalLogin,
  getMemorialFamilyRoomStatus,
  getMemorialAccessStatus,
  getSomangIntermentRecordForClaim,
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
  deleteUserAccount,
  isAdminLoginIdentifier,
  normalizeLocalLoginIdentifier,
  searchKioskMemorials,
  searchPublicMemorials,
  searchKioskSomangIntermentRecords,
  searchSomangIntermentRecords,
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
import {
  createIntermentMemorialCopy,
  isSearchableIntermentBirthDate,
} from "../shared/parentFinder";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  createPasswordAttemptLimiter,
  passwordAttemptKey,
} from "./_core/passwordAttemptLimiter";
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

const passwordAttemptLimiter = createPasswordAttemptLimiter();
const parentFinderSearchLimiter = createPasswordAttemptLimiter({
  failureLimit: 12,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});
const kioskIntermentSearchLimiter = createPasswordAttemptLimiter({
  failureLimit: 40,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});
const kioskMemorialSearchLimiter = createPasswordAttemptLimiter({
  failureLimit: 40,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});
const signupLimiter = createPasswordAttemptLimiter({
  failureLimit: 8,
  failureWindowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
});
const loginAttemptLimiter = createPasswordAttemptLimiter();
const letterSubmissionLimiter = createPasswordAttemptLimiter({
  failureLimit: 6,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});
const reminderSubscriptionLimiter = createPasswordAttemptLimiter({
  failureLimit: 3,
  failureWindowMs: 24 * 60 * 60 * 1000,
  blockMs: 24 * 60 * 60 * 1000,
});

function ensurePasswordAttemptAllowed(
  key: string,
  limiter = passwordAttemptLimiter
) {
  const result = limiter.check(key);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
}

function consumeParentFinderSearchAttempt(key: string) {
  const result = parentFinderSearchLimiter.check(key);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "보호를 위해 잠시 후 다시 찾아 주세요.",
    });
  }

  parentFinderSearchLimiter.recordFailure(key);
}

function consumeKioskIntermentSearchAttempt(key: string) {
  const result = kioskIntermentSearchLimiter.check(key);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "보호를 위해 잠시 후 다시 검색해 주세요.",
    });
  }

  kioskIntermentSearchLimiter.recordFailure(key);
}

function consumeKioskMemorialSearchAttempt(key: string) {
  const result = kioskMemorialSearchLimiter.check(key);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "보호를 위해 잠시 뒤 다시 검색해 주세요.",
    });
  }

  kioskMemorialSearchLimiter.recordFailure(key);
}

function consumePublicSubmissionAttempt(
  limiter: ReturnType<typeof createPasswordAttemptLimiter>,
  key: string,
  message = "보호를 위해 잠시 뒤 다시 시도해 주세요."
) {
  const result = limiter.check(key);
  if (!result.allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }

  limiter.recordFailure(key);
}

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

const parentFinderSearchInput = z.object({
  name: z.string().trim().min(2).max(120),
  // Optional: families can search by name alone. When a birth date is given it
  // must be a real date, and it narrows the results.
  birthDate: z
    .string()
    .trim()
    .refine(
      value => value === "" || isSearchableIntermentBirthDate(value),
      "생년월일을 정확히 입력해주세요."
    )
    .optional(),
});

const parentFinderCreateInput = parentFinderSearchInput.extend({
  recordId: z.number().int().positive(),
  familyConfirmation: z.literal(true),
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
  identifier: z
    .string()
    .trim()
    .min(1, "아이디 또는 이메일을 입력해주세요.")
    .max(320)
    .refine(
      value =>
        isAdminLoginIdentifier(value) ||
        z.string().email().safeParse(value).success,
      "아이디 또는 이메일 형식으로 입력해주세요."
    ),
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
  status: z.enum(["pending", "published", "private"]).optional(),
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

export const buildMemorialUpdateData = (
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
  }

  if (status) {
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
        consumePublicSubmissionAttempt(
          signupLimiter,
          passwordAttemptKey(ctx.req, "signup")
        );
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
        };
      }),
    login: publicProcedure
      .input(authLoginInput)
      .mutation(async ({ ctx, input }) => {
        const attemptKey = passwordAttemptKey(
          ctx.req,
          `login:${normalizeLocalLoginIdentifier(input.identifier)}`
        );
        ensurePasswordAttemptAllowed(attemptKey, loginAttemptLimiter);

        const user = await getUserByLocalLogin(input.identifier);
        if (
          !user?.passwordHash ||
          !verifyUserPassword(input.password, user.passwordHash)
        ) {
          loginAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "이메일 또는 비밀번호가 맞지 않습니다.",
          });
        }

        if (user.approvalStatus === "rejected") {
          loginAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비활성화된 계정입니다.",
          });
        }

        const signedInAt = new Date();
        loginAttemptLimiter.recordSuccess(attemptKey);
        await upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || normalizeLocalLoginIdentifier(input.identifier),
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
    deleteAccount: protectedProcedure
      .input(
        z.object({
          password: z.string().min(1, "비밀번호를 입력해주세요.").max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 계정을 지우는 일은 되돌릴 수 없으므로 비밀번호를 한 번 더 확인합니다.
        // 남이 잠깐 자리를 비운 사이 지워 버리는 일을 막습니다.
        const attemptKey = passwordAttemptKey(ctx.req, "delete-account");
        ensurePasswordAttemptAllowed(attemptKey, loginAttemptLimiter);

        const removed = await deleteUserAccount({
          userId: ctx.user.id,
          password: input.password,
        });

        if (!removed) {
          loginAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        loginAttemptLimiter.recordSuccess(attemptKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  kiosk: router({
    memorialSearch: publicProcedure
      .input(z.object({ keyword: z.string().trim().min(2).max(80) }))
      .query(async ({ ctx, input }) => {
        consumeKioskMemorialSearchAttempt(
          passwordAttemptKey(ctx.req, "kiosk-memorial-search")
        );

        const memorials = await searchKioskMemorials(input.keyword);
        return memorials.map(memorial => ({
          ...memorial,
          isPrivate: memorial.visibility === "private",
          href: `/kiosk/memorial/${memorial.slug}`,
        }));
      }),

    intermentSearch: publicProcedure
      .input(z.object({ keyword: z.string().trim().min(2).max(80) }))
      .query(async ({ ctx, input }) => {
        consumeKioskIntermentSearchAttempt(
          passwordAttemptKey(ctx.req, "kiosk-interment-search")
        );

        const records = await searchKioskSomangIntermentRecords(input.keyword);
        return records.map(record => ({
          id: record.id,
          name: record.name,
          message: "소망교회 소망동산에 안장되어 있습니다.",
        }));
      }),
  }),

  parentFinder: router({
    search: protectedProcedure
      .input(parentFinderSearchInput)
      .mutation(async ({ ctx, input }) => {
        consumeParentFinderSearchAttempt(
          passwordAttemptKey(ctx.req, `parent-finder:${ctx.user.id}`)
        );

        const records = await searchSomangIntermentRecords(input);
        return records.map(record => {
          const isOwner =
            record.memorialOwnerId === ctx.user.id || ctx.user.role === "admin";
          const isPublicMemorial =
            record.memorialVisibility === "public" &&
            record.memorialStatus === "published";

          return {
            id: record.id,
            name: record.name,
            role: record.role,
            affiliation: record.affiliation,
            birthDate: record.birthDate,
            deathDate: record.deathDate,
            memorial: record.memorialId
              ? {
                  state: isOwner
                    ? "owned"
                    : isPublicMemorial
                      ? "public"
                      : "restricted",
                  href:
                    isOwner || isPublicMemorial
                      ? `/memorial/${record.memorialSlug}`
                      : null,
                  editHref: isOwner
                    ? `/my/memorials/${record.memorialSlug}/edit`
                    : null,
                }
              : null,
          };
        });
      }),

    createMemorial: protectedProcedure
      .input(parentFinderCreateInput)
      .mutation(async ({ ctx, input }) => {
        const record = await getSomangIntermentRecordForClaim({
          id: input.recordId,
          name: input.name,
          birthDate: input.birthDate,
        });

        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "부모님 정보를 다시 확인해 주세요.",
          });
        }

        const existingAccess = (existing: typeof record) => {
          const isOwner =
            existing.memorialOwnerId === ctx.user.id ||
            ctx.user.role === "admin";
          const isPublicMemorial =
            existing.memorialVisibility === "public" &&
            existing.memorialStatus === "published";

          return {
            kind: "existing" as const,
            access: isOwner
              ? ("owner" as const)
              : isPublicMemorial
                ? ("public" as const)
                : ("restricted" as const),
            href:
              isOwner || isPublicMemorial
                ? `/memorial/${existing.memorialSlug}`
                : null,
            editHref: isOwner
              ? `/my/memorials/${existing.memorialSlug}/edit`
              : null,
          };
        };

        if (record.memorialId) {
          return existingAccess(record);
        }

        const copy = createIntermentMemorialCopy({
          name: record.name,
          role: record.role,
          deathDate: record.deathDate,
        });

        try {
          const created = await createMemorial({
            name: record.name,
            role: copy.role,
            // Some records store 0000-00-00 when the birth date is unknown; keep
            // it out of the memorial so the family can fill it in later.
            birthDate: isSearchableIntermentBirthDate(record.birthDate)
              ? record.birthDate
              : "",
            deathDate: record.deathDate,
            church: "소망교회",
            createdByUserId: ctx.user.id,
            intermentRecordId: record.id,
            slug: record.name,
            summary: copy.summary,
            story: copy.story,
            memorialDay: copy.memorialDay,
            visibility: "private",
            status: "private",
          });

          return {
            kind: "created" as const,
            href: `/memorial/${created.slug}`,
            editHref: `/my/memorials/${created.slug}/edit`,
          };
        } catch (error) {
          const linked = await getSomangIntermentRecordForClaim({
            id: input.recordId,
            name: input.name,
            birthDate: input.birthDate,
          });

          if (linked?.memorialId) {
            return existingAccess(linked);
          }

          throw error;
        }
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
      .mutation(async ({ ctx, input }) => {
        const attemptKey = passwordAttemptKey(ctx.req, `memorial:${input.slug}`);
        ensurePasswordAttemptAllowed(attemptKey);
        const access = await verifyMemorialAccessPassword(input);
        if (access === null) {
          passwordAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        if (access === false) {
          passwordAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        passwordAttemptLimiter.recordSuccess(attemptKey);
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
        const isAdmin = ctx.user.role === "admin";
        const visibility = input.visibility;

        if (
          visibility === "private" &&
          !input.accessPassword?.trim()
        ) {
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
          visibility,
          accessPasswordHash:
            visibility === "private" && input.accessPassword
              ? hashMemorialAccessPassword(input.accessPassword)
              : null,
          // Self-service memorials keep the family's requested visibility, but
          // are never searchable or public until an administrator publishes them.
          status: isAdmin ? "published" : "pending",
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
      .mutation(async ({ ctx, input }) => {
        const existing = await getAdminMemorialById(input.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        const updateData = buildMemorialUpdateData(input, existing);
        await updateMemorial(input.id, updateData);
        await createAdminAuditLog({
          adminUserId: ctx.user.id,
          action: "memorial.update",
          beforeValue: `${existing.status}/${existing.visibility}`,
          afterValue: `${updateData.status ?? existing.status}/${
            updateData.visibility ?? existing.visibility
          }`,
          note: `${existing.name} (${existing.slug})`,
        });
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

        if (ctx.user.role !== "admin" && existing.status === "published") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "게시 중인 추모관의 수정은 관리자 확인이 필요합니다. 관리자에게 수정 요청을 남겨 주세요.",
          });
        }

        if (
          input.visibility === "private" &&
          !input.accessPassword?.trim() &&
          !existing.accessPasswordHash
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "비공개 추모관은 입장 비밀번호가 필요합니다.",
          });
        }

        const editableInput =
          ctx.user.role === "admin"
            ? input
            : {
                ...input,
                status: undefined,
                managerMemo: undefined,
              };

        await updateMemorial(
          input.id,
          buildMemorialUpdateData(editableInput, existing)
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
        consumePublicSubmissionAttempt(
          letterSubmissionLimiter,
          passwordAttemptKey(ctx.req, "letter-create")
        );

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
      .mutation(async ({ ctx, input }) => {
        const attemptKey = passwordAttemptKey(
          ctx.req,
          `family-room:${input.memorialSlug}`
        );
        ensurePasswordAttemptAllowed(attemptKey);
        const room = await verifyMemorialFamilyRoomPassword(
          input.memorialSlug,
          input.password
        );

        if (room === null) {
          passwordAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "가족관을 찾을 수 없습니다.",
          });
        }

        if (room === false) {
          passwordAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        passwordAttemptLimiter.recordSuccess(attemptKey);
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
      .mutation(async ({ ctx, input }) => {
        consumePublicSubmissionAttempt(
          reminderSubscriptionLimiter,
          passwordAttemptKey(ctx.req, "reminder-subscribe"),
          "문자 알림 요청이 너무 많습니다. 내일 다시 시도해 주세요."
        );

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
