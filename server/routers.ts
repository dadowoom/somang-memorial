import { ENV } from "./_core/env";
import { toKioskInterment } from "../shared/kioskInterment";
import {
  getEmailConfigStatus,
  sendPasswordResetEmail,
} from "./_core/email";
import { COOKIE_NAME, SESSION_TTL_MS } from "@shared/const";
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
  getAdminMemorialLetterById,
  getReminderSubscriptionById,
  addFamilyRoomPhoto,
  deleteFamilyRoomPhoto,
  reorderFamilyRoomPhotos,
  updateFamilyRoomPhoto,
  getMemorialFamilyRoomManageInfo,
  updateMemorialFamilyRoomVideo,
  createMemorialFamilyRoom,
  updateMemorialFamilyRoomInfo,
  updateMemorialFamilyRoomPassword,
  canUserReadMemorialWithFamily,
  isMemorialFamilyMember,
  listFamilyMemberMemorialIds,
  listMemorialFamilyMembers,
  addMemorialFamilyMember,
  removeMemorialFamilyMember,
  getActiveMemorialFamilyInvitation,
  createMemorialFamilyInvitation,
  revokeMemorialFamilyInvitations,
  getMemorialFamilyInvitationByToken,
  FAMILY_INVITATION_TTL_DAYS,
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
  deleteMemorialById,
  verifyUserPasswordById,
  createPasswordResetToken,
  isAdminLoginIdentifier,
  PASSWORD_RESET_TTL_MINUTES,
  resetPasswordWithToken,
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
import { nanoid } from "nanoid";
import { decodeImageDataUrl } from "./_core/imageUpload";
import { storagePut } from "./storage";
import {
  collectReferencedUploadKeys,
  moveUploadsToTrash,
} from "./_core/uploadCleanup";
import { extractYoutubeVideoId } from "../shared/youtubeId";
import {
  createIntermentMemorialCopy,
  isSearchableIntermentBirthDate,
} from "../shared/parentFinder";
import {
  canManageMemorialFamilyRoom,
  type FamilyRoomUser,
} from "../shared/memorialFamilyRoomPermissions";
import {
  canInviteMemorialFamily,
  canManageMemorialAsFamily,
  memorialFamilyRole,
} from "../shared/memorialFamilyPermissions";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  createPasswordAttemptLimiter,
  passwordAttemptKey,
  subjectAttemptKey,
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
import { kioskPosterRouter } from "./routers/kioskPoster";
import { kioskInquiryRouter } from "./routers/kioskInquiry";
import { uploadRouter } from "./routers/upload";
import { videoRouter } from "./routers/video";
import { maskEmailForAudit, maskPhoneForAudit } from "../shared/auditNotes";
import { credentialFingerprint } from "./_core/sessionCredential";
import { describeBlockedMemorials } from "../shared/accountDeletion";
import { MEMORIAL_REMINDER_SIGNUP_ENABLED } from "../shared/featureFlags";
import {
  FAMILY_ROOM_PASSWORD_MIN,
  familyRoomPasswordProblem,
} from "../shared/familyRoomPassword";

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
// 계정 하나를 여러 곳에서 두드리는 것: 접속지와 무관하게 계정 기준 15회/30분.
const loginAccountLimiter = createPasswordAttemptLimiter({
  failureLimit: 15,
  failureWindowMs: 30 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
});
// 한 곳에서 계정을 바꿔 가며 두드리는 것: 계정과 무관하게 접속지 기준 30회/15분.
const loginAddressLimiter = createPasswordAttemptLimiter({
  failureLimit: 30,
  failureWindowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
});
// 재설정 메일은 남의 메일함으로 가는 것이라, 같은 곳에서 반복 요청하지 못하게 막는다.
const passwordResetRequestLimiter = createPasswordAttemptLimiter({
  failureLimit: 5,
  failureWindowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
});
const letterSubmissionLimiter = createPasswordAttemptLimiter({
  failureLimit: 6,
  failureWindowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
});
// 비공개 추모관·가족관 비밀번호를 여러 곳(접속지)에서 나눠 두드리는 것을 막는다.
// 접속지 기준 제한(5회/10분)만으로는 주소를 바꿔 가며 숫자 4자리(1만 가지)를
// 맞힐 수 있다. 비밀번호를 거는 대상(추모관·가족관) 하나를 기준으로 따로 센다.
const protectedRoomSubjectLimiter = createPasswordAttemptLimiter({
  failureLimit: 20,
  failureWindowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
});
const reminderSubscriptionLimiter = createPasswordAttemptLimiter({
  failureLimit: 3,
  failureWindowMs: 24 * 60 * 60 * 1000,
  blockMs: 24 * 60 * 60 * 1000,
});
// 같은 번호로 가는 확인 문자: 접속지를 바꿔 가며 남의 번호로 문자를 계속
// 보내는 것(문자 폭탄·요금)을 막는다. 번호 하나에 하루 3통.
const reminderPhoneLimiter = createPasswordAttemptLimiter({
  failureLimit: 3,
  failureWindowMs: 24 * 60 * 60 * 1000,
  blockMs: 24 * 60 * 60 * 1000,
});
// 서비스 전체의 확인 문자 하루 상한. 위 두 제한을 다 피해도 요금이 끝없이
// 나가지 않게 하는 마지막 안전장치다.
const reminderDailyTotalLimiter = createPasswordAttemptLimiter({
  failureLimit: 200,
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
      message: "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해 주세요.",
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
  // 소천 전에 미리 추모관을 준비하는 경우가 있어 비워둘 수 있게 한다.
  deathDate: z.string().trim().max(20).default(""),
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
      message: "받는 분을 입력해 주세요.",
    });
  });

const familyRoomVerifyInput = z.object({
  memorialSlug: z.string().trim().min(1).max(120),
  password: z.string().trim().min(1).max(100),
});

// 가족관 비밀번호는 숫자 4~6자리로만 새로 정한다 (2026-09-16 결정,
// shared/familyRoomPassword.ts). 들어갈 때(familyRoomVerifyInput)는 예전에
// 정해 둔 비밀번호도 계속 받는다.
const familyRoomPasswordField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = familyRoomPasswordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const familyRoomSlugField = z.string().trim().min(1).max(120);

const familyRoomInfoFields = {
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(160),
  intro: z.string().trim().min(1, "소개글을 입력해 주세요.").max(2000),
};

const familyRoomCreateInput = z.object({
  memorialSlug: familyRoomSlugField,
  ...familyRoomInfoFields,
  password: familyRoomPasswordField,
});

const familyRoomUpdateInfoInput = z.object({
  memorialSlug: familyRoomSlugField,
  ...familyRoomInfoFields,
});

const familyRoomUpdatePasswordInput = z.object({
  memorialSlug: familyRoomSlugField,
  password: familyRoomPasswordField,
});

// 가족관 영상·사진 (2026-09-16)
const familyRoomUpdateVideoInput = z.object({
  memorialSlug: familyRoomSlugField,
  /** 유튜브 주소 또는 영상 번호. 빈칸이면 영상을 뺀다. */
  youtube: z.string().trim().max(500),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
});

const familyRoomAddPhotoInput = z.object({
  memorialSlug: familyRoomSlugField,
  dataUrl: z.string(),
  fileName: z.string().max(260),
  caption: z.string().trim().max(500).optional(),
});

const familyRoomDeletePhotoInput = z.object({
  memorialSlug: familyRoomSlugField,
  photoId: z.number().int().positive(),
});

/** 가족관 하나에 둘 수 있는 사진 수. */
export const FAMILY_ROOM_PHOTO_LIMIT = 100;

// 가족관 사진의 설명·연도 고치기와 순서 바꾸기 (2026-09-16, 추모관 앨범과 같은 방식).
// 빈칸으로 저장하면 설명·연도를 지운다.
const familyRoomUpdatePhotoInput = z.object({
  memorialSlug: familyRoomSlugField,
  photoId: z.number().int().positive(),
  caption: z.string().trim().max(500).nullable().optional(),
  year: z.string().trim().max(20).nullable().optional(),
});

const familyRoomReorderPhotosInput = z.object({
  memorialSlug: familyRoomSlugField,
  photoIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(FAMILY_ROOM_PHOTO_LIMIT),
});

/**
 * 유가족이 직접 하는 일(가족관·초대)의 감사기록에 "누가"를 남기는 방법.
 * 관리자가 했으면 adminUserId, 유가족이 했으면 targetUserId 에 본인을 적는다.
 * 관리자 화면은 adminUserId 가 없으면 "유가족 본인"으로 표시한다 (2026-09-14).
 */
function familyAuditActor(user: { id: number; role: string }) {
  return user.role === "admin"
    ? { adminUserId: user.id, targetUserId: null }
    : { adminUserId: null, targetUserId: user.id };
}

/** 권한 판단은 shared/memorialFamilyRoomPermissions.ts 에 있다. 여기서는 찾아오고 막기만 한다. */
async function requireFamilyRoomManagePermission(
  user: FamilyRoomUser,
  memorialSlug: string
) {
  const info = await getMemorialFamilyRoomManageInfo(memorialSlug);
  if (!info) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "추모관을 찾을 수 없습니다.",
    });
  }

  // 가족 초대로 함께 관리하는 가족도 가족관을 관리한다 (2026-09-13).
  // 주인·관리자는 조회 없이 통과하므로 그 외에만 DB 를 본다.
  const isFamilyMember =
    user !== null &&
    user.role !== "admin" &&
    info.createdByUserId !== user.id &&
    (await isMemorialFamilyMember(info.memorialId, user.id));
  if (!canManageMemorialFamilyRoom(info, user, isFamilyMember)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "가족관을 관리할 권한이 없습니다.",
    });
  }

  return info;
}

/** 권한 확인에 더해, 가족관이 실제로 있어야 하는 작업에 쓴다. */
async function requireExistingFamilyRoom(
  user: FamilyRoomUser,
  memorialSlug: string
) {
  const info = await requireFamilyRoomManagePermission(user, memorialSlug);
  if (!info.exists) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "아직 가족관이 없습니다. 먼저 가족관을 만들어 주세요.",
    });
  }

  return info;
}

/** 가족을 초대하거나 제외할 수 있는지. 주인과 관리자만 (shared/memorialFamilyPermissions). */
async function requireFamilyInvitePermission(
  user: FamilyRoomUser,
  memorialSlug: string
) {
  const memorial = await getAdminMemorialBySlug(memorialSlug);
  if (!memorial) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "추모관을 찾을 수 없습니다.",
    });
  }

  if (!canInviteMemorialFamily(memorial, user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "가족을 초대할 수 있는 분은 추모관을 만든 분과 교회 관리자뿐입니다.",
    });
  }

  return memorial;
}


const parentFinderSearchInput = z.object({
  name: z.string().trim().min(2).max(120),
  // Optional: families can search by name alone. When a birth date is given it
  // must be a real date, and it narrows the results.
  birthDate: z
    .string()
    .trim()
    .refine(
      value => value === "" || isSearchableIntermentBirthDate(value),
      "생년월일을 정확히 입력해 주세요."
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
    .regex(/^[0-9\-\s+()]+$/, "휴대폰 번호 형식으로 입력해 주세요."),
  consent: z.literal(true),
  accessToken: z.string().trim().max(128).optional(),
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
    .regex(/^[0-9\-\s+()]+$/, "휴대폰 번호 형식으로 입력해 주세요."),
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
  name: z.string().trim().min(2, "성함을 입력해 주세요.").max(80),
  email: z.string().trim().email("이메일 형식으로 입력해 주세요.").max(320),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9\-\s+()]*$/, "휴대폰 번호 형식으로 입력해 주세요.")
    .optional(),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해 주세요.").max(100),
  // 필수 동의 세 가지를 모두 받아야 가입된다. 화면만 믿지 않고 서버도 확인한다.
  consents: z.object(
    {
      privacy: z.literal(true),
      terms: z.literal(true),
      over14: z.literal(true),
    },
    { message: "필수 동의가 필요합니다." }
  ),
});

const authLoginInput = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "아이디 또는 이메일을 입력해 주세요.")
    .max(320)
    .refine(
      value =>
        isAdminLoginIdentifier(value) ||
        z.string().email().safeParse(value).success,
      "아이디 또는 이메일 형식으로 입력해 주세요."
    ),
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(100),
});

const passwordResetRequestInput = z.object({
  email: z.string().trim().email("이메일 형식으로 입력해 주세요.").max(320),
});

const passwordResetConfirmInput = z.object({
  token: z.string().trim().min(1).max(200),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해 주세요.").max(100),
});

const textDisplaySizeSchema = z.enum(["auto", "small", "normal", "large"]);

export const memorialUpdateInput = z.object({
  id: z.number(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(80).optional(),
  birthDate: z.string().trim().min(1).max(20).optional(),
  deathDate: z.string().trim().max(20).optional(),
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
            expiresInMs: SESSION_TTL_MS,
            credential: credentialFingerprint(created.passwordHash),
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: SESSION_TTL_MS,
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
        const identifier = normalizeLocalLoginIdentifier(input.identifier);
        // 세 겹으로 막는다 (2026-09-14). 같은 곳에서 같은 계정(5회/10분)만 보면
        // (1) 여러 곳에서 한 계정을 두드리는 것과 (2) 한 곳에서 계정을 바꿔 가며
        // 두드리는 것을 못 막는다. 계정 단위와 접속지 단위를 따로 센다.
        const attemptKey = passwordAttemptKey(ctx.req, `login:${identifier}`);
        const accountKey = subjectAttemptKey(`login-account:${identifier}`);
        const addressKey = passwordAttemptKey(ctx.req, "login-address");
        ensurePasswordAttemptAllowed(attemptKey, loginAttemptLimiter);
        ensurePasswordAttemptAllowed(accountKey, loginAccountLimiter);
        ensurePasswordAttemptAllowed(addressKey, loginAddressLimiter);
        const recordLoginFailure = () => {
          loginAttemptLimiter.recordFailure(attemptKey);
          loginAccountLimiter.recordFailure(accountKey);
          loginAddressLimiter.recordFailure(addressKey);
        };

        const user = await getUserByLocalLogin(input.identifier);
        if (
          !user?.passwordHash ||
          !verifyUserPassword(input.password, user.passwordHash)
        ) {
          recordLoginFailure();
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "아이디 또는 이메일과 비밀번호를 다시 확인해 주세요.",
          });
        }

        if (user.approvalStatus === "rejected") {
          recordLoginFailure();
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비활성화된 계정입니다.",
          });
        }

        const signedInAt = new Date();
        loginAttemptLimiter.recordSuccess(attemptKey);
        loginAccountLimiter.recordSuccess(accountKey);
        loginAddressLimiter.recordSuccess(addressKey);
        await upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || identifier,
          expiresInMs: SESSION_TTL_MS,
          credential: credentialFingerprint(user.passwordHash),
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESSION_TTL_MS,
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
          password: z.string().min(1, "비밀번호를 입력해 주세요.").max(100),
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

        if (!removed.ok && removed.reason === "password") {
          loginAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        // 이어서 관리할 가족이 없는 추모관이 있으면 탈퇴하지 않는다. 주인 없는
        // 추모관을 만들지 않으려는 것이다 (2026-09-14).
        if (!removed.ok) {
          loginAttemptLimiter.recordSuccess(attemptKey);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: describeBlockedMemorials(removed.blocked),
          });
        }

        loginAttemptLimiter.recordSuccess(attemptKey);
        // 가족에게 넘어간 추모관은 새 주인을 대상으로 기록한다.
        for (const transfer of removed.handedOver) {
          await createAdminAuditLog({
            adminUserId: null,
            targetUserId: transfer.toUserId,
            action: "memorial.owner.transfer",
            note: `${transfer.name} (${transfer.slug}) · 탈퇴한 회원번호 ${ctx.user.id} → 가족 ${transfer.toName ?? transfer.toUserId}`,
          });
        }
        // 탈퇴는 되돌릴 수 없으므로 "누가 언제"만이라도 남긴다. 회원 행은 이미 지워져
        // targetUserId 를 걸 수 없으니 번호와 가린 이메일을 메모에 적는다 (2026-09-14).
        await createAdminAuditLog({
          adminUserId: null,
          targetUserId: null,
          action: "user.delete",
          note: `회원 탈퇴 (회원번호 ${ctx.user.id}, ${maskEmailForAudit(ctx.user.email)})`,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

        return { success: true } as const;
      }),

    requestPasswordReset: publicProcedure
      .input(passwordResetRequestInput)
      .mutation(async ({ ctx, input }) => {
        const attemptKey = passwordAttemptKey(ctx.req, "password-reset");
        ensurePasswordAttemptAllowed(attemptKey, passwordResetRequestLimiter);
        passwordResetRequestLimiter.recordFailure(attemptKey);

        // 메일을 보낼 수 없는 상태라면 보냈다고 하지 않는다. 이용자가 오지
        // 않을 메일을 계속 기다리게 된다. 그 경우에는 교회로 연락하도록 알린다.
        const mail = getEmailConfigStatus();
        if (!mail.enabled) {
          console.error(
            "[PasswordReset] 메일 설정(SMTP)이 없어 재설정 메일을 보내지 못했습니다."
          );
          return {
            success: false,
            emailDelivery: false,
            expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
          } as const;
        }

        const created = await createPasswordResetToken(input.email);

        // 가입된 이메일인지 아닌지를 응답으로 알 수 있으면, 누가 가입했는지
        // 확인하는 데 쓰인다. 결과와 무관하게 같은 답을 돌려준다.
        if (created) {
          const base = ENV.publicSiteUrl || "";
          const resetUrl = `${base}/reset-password?token=${encodeURIComponent(created.token)}`;
          try {
            await sendPasswordResetEmail({
              to: created.email,
              resetUrl,
              expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
            });
          } catch (error) {
            console.error("[PasswordReset] 메일 발송 실패", error);
          }
        }

        return {
          success: true,
          emailDelivery: true,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        } as const;
      }),

    confirmPasswordReset: publicProcedure
      .input(passwordResetConfirmInput)
      .mutation(async ({ input }) => {
        const changed = await resetPasswordWithToken(input);
        if (!changed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.",
          });
        }

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
        return records.map(toKioskInterment);
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
        // 가족 초대로 함께 관리하는 추모관도 "내 것"으로 본다 (2026-09-13).
        const familyMemorialIds = new Set(
          await listFamilyMemberMemorialIds(ctx.user.id)
        );
        return records.map(record => {
          const isOwner =
            record.memorialOwnerId === ctx.user.id ||
            ctx.user.role === "admin" ||
            (record.memorialId !== null &&
              familyMemorialIds.has(record.memorialId));
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

        const existingAccess = async (existing: typeof record) => {
          const isOwner =
            existing.memorialOwnerId === ctx.user.id ||
            ctx.user.role === "admin" ||
            // 가족 초대로 함께 관리하는 가족이면 바로 수정 화면으로 보낸다.
            (existing.memorialId !== null &&
              (await isMemorialFamilyMember(existing.memorialId, ctx.user.id)));
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
          burialPlace: record.burialPlace,
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
            // 작성 중으로 시작한다. 가족이 공개 범위·사진을 정하고 "등록 완료"를
            // 눌러야 다른 분들에게 보인다 (2026-09-16 결정).
            status: "pending",
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
        const subjectKey = subjectAttemptKey(`memorial:${input.slug}`);
        ensurePasswordAttemptAllowed(attemptKey);
        ensurePasswordAttemptAllowed(subjectKey, protectedRoomSubjectLimiter);
        const recordFailure = () => {
          passwordAttemptLimiter.recordFailure(attemptKey);
          protectedRoomSubjectLimiter.recordFailure(subjectKey);
        };
        const access = await verifyMemorialAccessPassword(input);
        if (access === null) {
          recordFailure();
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        if (access === false) {
          recordFailure();
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        passwordAttemptLimiter.recordSuccess(attemptKey);
        protectedRoomSubjectLimiter.recordSuccess(subjectKey);
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

        if (
          !(await canUserReadMemorialWithFamily(
            memorial,
            input.accessToken,
            ctx.user
          ))
        ) {
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
          // 작성 중으로 시작한다 (2026-09-16 결정). 관리자 확인은 없고, 가족이
          // 사진과 글을 준비한 뒤 "등록 완료"를 누르면 고른 공개 범위대로 보인다.
          status: "pending",
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

    // 등록 완료 (2026-09-16 결정). 추모관은 "작성 중"(pending)으로 시작하고, 가족이
    // 사진과 글을 다 준비한 뒤 이것을 눌러야 다른 분들이 보고 편지를 남길 수 있다.
    // 주인·초대받은 가족·관리자가 누를 수 있다.
    completeRegistration: protectedProcedure
      .input(z.object({ slug: z.string().trim().min(1).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPublicMemorialBySlug(input.slug);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        const isFamilyMember =
          ctx.user.role !== "admin" &&
          existing.createdByUserId !== ctx.user.id &&
          (await isMemorialFamilyMember(existing.id, ctx.user.id));
        if (!canManageMemorialAsFamily(existing, ctx.user, isFamilyMember)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "등록을 마칠 권한이 없습니다. 추모관을 만든 가족, 초대받은 가족, 관리자만 할 수 있습니다.",
          });
        }

        if (existing.status === "published") {
          return { success: true, status: "published" as const, alreadyComplete: true };
        }
        if (existing.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "관리자가 비공개로 돌려 둔 추모관입니다. 다시 공개하려면 관리자에게 문의해 주세요.",
          });
        }
        if (existing.visibility === "private" && !existing.accessPasswordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "비공개 추모관은 입장 비밀번호를 먼저 정해 주세요. ‘이어서 수정’의 공개 설정에서 정할 수 있습니다.",
          });
        }

        await updateMemorial(existing.id, { status: "published" });
        await createAdminAuditLog({
          adminUserId: ctx.user.role === "admin" ? ctx.user.id : null,
          targetUserId: existing.createdByUserId ?? ctx.user.id,
          action: "memorial.registration.complete",
          beforeValue: "pending",
          afterValue: "published",
          note: `${existing.name} (${existing.slug})`,
        });

        return { success: true, status: "published" as const, alreadyComplete: false };
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

    // 추모관을 통째로 지운다 (2026-09-19). 개인정보처리방침의 "지우면 파기"
    // 약속과, 유족의 삭제 요청을 처리할 수 있어야 해서 만들었다.
    // 되돌릴 수 없으므로 추모관을 만든 사람과 관리자만, 이름을 그대로 적고
    // 비밀번호를 한 번 더 넣어야 지울 수 있다. 초대받은 가족은 지울 수 없다.
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          confirmName: z.string().trim().min(1).max(120),
          password: z.string().min(1, "비밀번호를 입력해 주세요.").max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getAdminMemorialById(input.id);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        const isAdmin = ctx.user.role === "admin";
        const isOwner = existing.createdByUserId === ctx.user.id;
        if (!isAdmin && !isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "추모관을 만든 분과 관리자만 삭제할 수 있습니다.",
          });
        }

        if (input.confirmName !== existing.name.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "고인의 성함을 정확히 적어 주세요.",
          });
        }

        const attemptKey = passwordAttemptKey(ctx.req, "delete-memorial");
        ensurePasswordAttemptAllowed(attemptKey, loginAttemptLimiter);
        if (!(await verifyUserPasswordById(ctx.user.id, input.password))) {
          loginAttemptLimiter.recordFailure(attemptKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }
        loginAttemptLimiter.recordSuccess(attemptKey);

        // 지우기 전과 후에 DB 가 쓰는 사진 주소를 비교해, 이번 삭제로 더 이상
        // 아무 데도 쓰이지 않게 된 파일만 바로 휴지통으로 옮긴다. 다른 곳에서도
        // 쓰는 사진은 그대로 남는다.
        const before = await collectReferencedUploadKeys();
        await deleteMemorialById(existing.id);
        let movedFiles = 0;
        try {
          const after = await collectReferencedUploadKeys();
          const released = Array.from(before).filter(key => !after.has(key));
          movedFiles = moveUploadsToTrash(released);
        } catch (error) {
          // 파일은 새벽 정리가 다시 찾아 치운다. 삭제 자체는 끝났다.
          console.error("[MemorialDelete] 사진 파일 정리 실패", error);
        }

        await createAdminAuditLog({
          adminUserId: isAdmin ? ctx.user.id : null,
          targetUserId: existing.createdByUserId ?? null,
          action: "memorial.delete",
          beforeValue: `${existing.status}/${existing.visibility}`,
          afterValue: "deleted",
          note: `${existing.name} (${existing.slug}) · ${
            isAdmin && !isOwner ? "관리자" : "만든 분"
          }이 삭제 · 사진 파일 ${movedFiles}개 정리`,
        });

        return { success: true } as const;
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

        // 주인·관리자가 아니면 가족 초대로 함께 관리하는 가족인지 확인한다.
        const isFamilyMember =
          ctx.user.role !== "admin" &&
          existing.createdByUserId !== ctx.user.id &&
          (await isMemorialFamilyMember(existing.id, ctx.user.id));
        if (!canManageMemorialAsFamily(existing, ctx.user, isFamilyMember)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "수정 권한이 없습니다.",
          });
        }

        // 게시된 뒤에도 유가족이 직접 고친다 (2026-09-12 결정). 관리자 사전 확인 대신
        // 아래에서 감사기록을 남겨 사후에 확인한다. 추모관이 늘면 수정 요청을 교회가
        // 하나하나 받아 처리하는 것이 감당이 안 되기 때문이다.

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

        // 게시 중인 추모관을 유가족이 직접 고쳤다는 기록. 관리자 화면의 감사기록에서
        // "누가 언제 어느 추모관을" 확인할 수 있게 한다. 확인 대기(pending)는 원래
        // 유가족이 고치는 단계라 기록하지 않는다.
        if (ctx.user.role !== "admin" && existing.status === "published") {
          await createAdminAuditLog({
            adminUserId: null,
            targetUserId: ctx.user.id,
            action: "memorial.member.update",
            beforeValue: `${existing.status}/${existing.visibility}`,
            afterValue: `${existing.status}/${
              editableInput.visibility ?? existing.visibility
            }`,
            note: `${existing.name} (${existing.slug})`,
          });
        }

        return { success: true };
      }),
  }),

  letter: router({
    adminList: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(300) }))
      .query(async ({ input }) => listAdminMemorialLetters(input.limit)),

    updateStatus: adminProcedure
      .input(adminLetterStatusInput)
      .mutation(async ({ ctx, input }) => {
        const letter = await getAdminMemorialLetterById(input.id);
        if (!letter) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "편지를 찾을 수 없습니다.",
          });
        }
        await updateMemorialLetterStatus(input.id, input.status);
        // 편지를 숨기거나 되살린 관리자를 남긴다 (2026-09-14).
        await createAdminAuditLog({
          adminUserId: ctx.user.id,
          action: "letter.status.update",
          beforeValue: letter.status,
          afterValue: input.status,
          note: `편지 ${letter.id} · ${letter.author} → ${letter.memorialName}${
            letter.memorialSlug ? ` (${letter.memorialSlug})` : ""
          }`,
        });
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
        if (
          !(await canUserReadMemorialWithFamily(
            memorial,
            input.accessToken,
            ctx.user
          ))
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "비공개 추모관입니다.",
          });
        }

        // 작성 중(등록 완료 전)인 추모관은 편지를 보여 주지도 받지도 않는다 (2026-09-16).
        if (memorial.status !== "published") return [];

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
          if (
          !(await canUserReadMemorialWithFamily(
            memorial,
            input.accessToken,
            ctx.user
          ))
        ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "비공개 추모관입니다.",
            });
          }
          if (memorial.status !== "published") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "추모관 등록이 끝난 뒤에 편지를 남길 수 있습니다.",
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
        const subjectKey = subjectAttemptKey(
          `family-room:${input.memorialSlug}`
        );
        ensurePasswordAttemptAllowed(attemptKey);
        ensurePasswordAttemptAllowed(subjectKey, protectedRoomSubjectLimiter);
        const recordFailure = () => {
          passwordAttemptLimiter.recordFailure(attemptKey);
          protectedRoomSubjectLimiter.recordFailure(subjectKey);
        };
        const room = await verifyMemorialFamilyRoomPassword(
          input.memorialSlug,
          input.password
        );

        if (room === null) {
          recordFailure();
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "가족관을 찾을 수 없습니다.",
          });
        }

        if (room === false) {
          recordFailure();
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "비밀번호가 맞지 않습니다.",
          });
        }

        passwordAttemptLimiter.recordSuccess(attemptKey);
        protectedRoomSubjectLimiter.recordSuccess(subjectKey);
        return room;
      }),

    // 아래 세 가지는 가족관을 만들고 고치는 통로다. 추모관을 만든 유가족과
    // 교회 관리자만 쓸 수 있다.
    manage: protectedProcedure
      .input(z.object({ memorialSlug: familyRoomSlugField }))
      .query(async ({ ctx, input }) => {
        const info = await requireFamilyRoomManagePermission(
          ctx.user,
          input.memorialSlug
        );

        return {
          memorialSlug: info.memorialSlug,
          memorialName: info.memorialName,
          exists: info.exists,
          title: info.title,
          intro: info.intro,
          updatedAt: info.updatedAt,
          href: info.href,
          passwordMinLength: FAMILY_ROOM_PASSWORD_MIN,
          video: info.video,
          photos: info.photos,
          photoLimit: FAMILY_ROOM_PHOTO_LIMIT,
        };
      }),

    create: protectedProcedure
      .input(familyRoomCreateInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireFamilyRoomManagePermission(
          ctx.user,
          input.memorialSlug
        );

        if (info.exists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "이미 가족관이 있습니다.",
          });
        }

        const result = await createMemorialFamilyRoom({
          memorialId: info.memorialId,
          title: input.title,
          intro: input.intro,
          password: input.password,
        });

        // 두 번 눌러 두 개가 생기는 일은 없다. 이미 있었다면 만들지 않고 알린다.
        if (!result.created) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "이미 가족관이 있습니다.",
          });
        }

        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.create",
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),

    updateInfo: protectedProcedure
      .input(familyRoomUpdateInfoInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );

        await updateMemorialFamilyRoomInfo({
          memorialId: info.memorialId,
          title: input.title,
          intro: input.intro,
        });
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.info.update",
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),

    updatePassword: protectedProcedure
      .input(familyRoomUpdatePasswordInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );

        await updateMemorialFamilyRoomPassword({
          memorialId: info.memorialId,
          password: input.password,
        });
        // 비밀번호 자체는 절대 적지 않는다. "누가 언제 바꿨다"만 남긴다.
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.password.update",
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),

    // 가족관 영상 (2026-09-16). 유튜브 주소를 붙여 넣으면 번호만 저장한다.
    updateVideo: protectedProcedure
      .input(familyRoomUpdateVideoInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );

        const youtubeVideoId = input.youtube
          ? extractYoutubeVideoId(input.youtube)
          : null;
        if (input.youtube && !youtubeVideoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "유튜브 주소를 알아볼 수 없습니다. 주소를 다시 확인해 주세요.",
          });
        }

        await updateMemorialFamilyRoomVideo({
          memorialId: info.memorialId,
          youtubeVideoId,
          videoTitle: youtubeVideoId ? input.title || null : null,
          videoDescription: youtubeVideoId ? input.description || null : null,
        });
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.video.update",
          afterValue: youtubeVideoId ?? "(없음)",
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true, youtubeVideoId };
      }),

    // 가족관 사진 (2026-09-16). 파일은 family-rooms/<가족관번호>/ 아래에 저장한다.
    addPhoto: protectedProcedure
      .input(familyRoomAddPhotoInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );
        if (!info.roomId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "아직 가족관이 없습니다. 먼저 가족관을 만들어 주세요.",
          });
        }
        if (info.photos.length >= FAMILY_ROOM_PHOTO_LIMIT) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `가족관 사진은 ${FAMILY_ROOM_PHOTO_LIMIT}장까지 둘 수 있습니다.`,
          });
        }

        // 추모관 사진과 같은 통로다. 형식을 확인하고 위치·기기 정보를 지운다.
        const { buffer, mimeType, ext } = decodeImageDataUrl(input.dataUrl);
        const key = `family-rooms/${info.roomId}/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, mimeType);

        await addFamilyRoomPhoto({
          familyRoomId: info.roomId,
          photoUrl: url,
          photoKey: key,
          caption: input.caption || null,
        });
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.photo.add",
          afterValue: key.slice(0, 120),
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true, url };
      }),

    deletePhoto: protectedProcedure
      .input(familyRoomDeletePhotoInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );
        if (!info.roomId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "아직 가족관이 없습니다.",
          });
        }

        // 이 가족관의 사진일 때만 지워진다. 다른 가족관 사진 번호는 "없음"이다.
        const result = await deleteFamilyRoomPhoto(input.photoId, info.roomId);
        if (!result.deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "사진을 찾을 수 없습니다.",
          });
        }
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.photo.delete",
          beforeValue: String(input.photoId),
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),

    updatePhoto: protectedProcedure
      .input(familyRoomUpdatePhotoInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );
        if (!info.roomId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "아직 가족관이 없습니다.",
          });
        }

        const data: { caption?: string | null; year?: string | null } = {};
        if (input.caption !== undefined) data.caption = input.caption || null;
        if (input.year !== undefined) data.year = input.year || null;
        if (Object.keys(data).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "고칠 내용이 없습니다.",
          });
        }

        // 이 가족관의 사진일 때만 고쳐진다. 다른 가족관 사진 번호는 "없음"이다.
        const result = await updateFamilyRoomPhoto(
          input.photoId,
          info.roomId,
          data
        );
        if (!result.updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "사진을 찾을 수 없습니다.",
          });
        }
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.photo.update",
          beforeValue: String(input.photoId),
          afterValue: [data.caption, data.year]
            .filter(value => value !== undefined)
            .map(value => value ?? "(비움)")
            .join(" · ")
            .slice(0, 120),
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),

    reorderPhotos: protectedProcedure
      .input(familyRoomReorderPhotosInput)
      .mutation(async ({ ctx, input }) => {
        const info = await requireExistingFamilyRoom(
          ctx.user,
          input.memorialSlug
        );
        if (!info.roomId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "아직 가족관이 없습니다.",
          });
        }

        // 지금 이 가족관에 있는 사진을 빠짐없이, 한 번씩만 보내야 한다. 그 사이
        // 다른 가족이 사진을 올리거나 지웠으면 순서를 저장하지 않는다.
        const current = new Set(info.photos.map(photo => photo.id));
        const requested = new Set(input.photoIds);
        const sameSet =
          requested.size === input.photoIds.length &&
          requested.size === current.size &&
          input.photoIds.every(id => current.has(id));
        if (!sameSet) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "그사이 사진이 바뀌었습니다. 화면을 새로 고친 뒤 다시 해 주세요.",
          });
        }

        await reorderFamilyRoomPhotos(info.roomId, input.photoIds);
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "family_room.photo.reorder",
          afterValue: input.photoIds.join(",").slice(0, 120),
          note: `${info.memorialName} (${info.memorialSlug})`,
        });

        return { success: true };
      }),
  }),

  // 가족 초대 (2026-09-13). 주인이 초대 링크를 만들어 가족에게 주면, 그 링크로 들어온
  // 가족이 함께 관리한다. 초대·제외는 주인과 관리자만, 본인이 나가는 것은 누구나.
  familyMembers: router({
    list: protectedProcedure
      .input(z.object({ memorialSlug: familyRoomSlugField }))
      .query(async ({ ctx, input }) => {
        const memorial = await requireFamilyInvitePermission(
          ctx.user,
          input.memorialSlug
        );
        const [members, invitation] = await Promise.all([
          listMemorialFamilyMembers(memorial.id),
          getActiveMemorialFamilyInvitation(memorial.id),
        ]);

        return {
          memorialSlug: memorial.slug,
          memorialName: memorial.name,
          members: members.map(member => ({
            userId: member.userId,
            name: member.name ?? "",
            email: member.email ?? "",
            joinedAt: member.joinedAt,
          })),
          invitation: invitation
            ? { expiresAt: invitation.expiresAt, createdAt: invitation.createdAt }
            : null,
          invitationDays: FAMILY_INVITATION_TTL_DAYS,
        };
      }),

    createInvitation: protectedProcedure
      .input(z.object({ memorialSlug: familyRoomSlugField }))
      .mutation(async ({ ctx, input }) => {
        const memorial = await requireFamilyInvitePermission(
          ctx.user,
          input.memorialSlug
        );
        const created = await createMemorialFamilyInvitation({
          memorialId: memorial.id,
          createdByUserId: ctx.user.id,
        });
        // 링크 원문은 기록하지 않는다. 발급 사실과 만료일만 남긴다 (2026-09-14).
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "memorial.family.invite",
          afterValue: created.expiresAt.toISOString().slice(0, 10),
          note: `${memorial.name} (${memorial.slug})`,
        });

        // 원문 링크는 이때 한 번만 보여준다. 저장은 해시로만 하므로 다시 못 꺼낸다.
        return {
          href: `/invite/${created.token}`,
          expiresAt: created.expiresAt,
        };
      }),

    revokeInvitation: protectedProcedure
      .input(z.object({ memorialSlug: familyRoomSlugField }))
      .mutation(async ({ ctx, input }) => {
        const memorial = await requireFamilyInvitePermission(
          ctx.user,
          input.memorialSlug
        );
        await revokeMemorialFamilyInvitations(memorial.id);
        await createAdminAuditLog({
          ...familyAuditActor(ctx.user),
          action: "memorial.family.invite.revoke",
          note: `${memorial.name} (${memorial.slug})`,
        });
        return { success: true };
      }),

    removeMember: protectedProcedure
      .input(
        z.object({
          memorialSlug: familyRoomSlugField,
          userId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const memorial = await getAdminMemorialBySlug(input.memorialSlug);
        if (!memorial) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

        // 본인이 나가는 것은 누구나, 남을 빼는 것은 주인과 관리자만.
        const leavingSelf = input.userId === ctx.user.id;
        if (!leavingSelf && !canInviteMemorialFamily(memorial, ctx.user)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "가족을 제외할 수 있는 분은 추모관을 만든 분과 교회 관리자뿐입니다.",
          });
        }

        await removeMemorialFamilyMember({
          memorialId: memorial.id,
          userId: input.userId,
        });
        await createAdminAuditLog({
          adminUserId: ctx.user.role === "admin" ? ctx.user.id : null,
          targetUserId: input.userId,
          action: leavingSelf ? "memorial.family.leave" : "memorial.family.remove",
          note: `${memorial.name} (${memorial.slug})`,
        });
        return { success: true };
      }),

    invitationInfo: protectedProcedure
      .input(z.object({ token: z.string().trim().min(10).max(200) }))
      .query(async ({ ctx, input }) => {
        const invitation = await getMemorialFamilyInvitationByToken(input.token);
        if (!invitation) return { valid: false as const };

        const role = memorialFamilyRole(
          { createdByUserId: invitation.memorialOwnerId },
          ctx.user,
          await isMemorialFamilyMember(invitation.memorialId, ctx.user.id)
        );

        return {
          valid: true as const,
          memorialSlug: invitation.memorialSlug,
          memorialName: invitation.memorialName,
          memorialRole: invitation.memorialRole,
          alreadyMember: role !== null,
          expiresAt: invitation.expiresAt,
        };
      }),

    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string().trim().min(10).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await getMemorialFamilyInvitationByToken(input.token);
        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "초대 링크가 만료되었거나 더 이상 쓸 수 없습니다. 초대한 가족에게 새 링크를 받아 주세요.",
          });
        }

        const result = await addMemorialFamilyMember({
          memorialId: invitation.memorialId,
          userId: ctx.user.id,
          invitedByUserId: invitation.invitedByUserId,
        });
        if (result.added) {
          await createAdminAuditLog({
            adminUserId: null,
            targetUserId: ctx.user.id,
            action: "memorial.family.join",
            note: `${invitation.memorialName} (${invitation.memorialSlug})`,
          });
        }

        return {
          memorialSlug: invitation.memorialSlug,
          memorialName: invitation.memorialName,
          href: "/my/memorials",
          added: result.added,
          reason: result.added ? null : result.reason,
        };
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
      .mutation(async ({ ctx, input }) => {
        const subscription = await getReminderSubscriptionById(input.id);
        if (!subscription) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "문자 알림 신청을 찾을 수 없습니다.",
          });
        }
        await updateReminderSubscriptionStatus(input.id, input.status);
        // 문자 알림을 취소·복구한 관리자를 남긴다. 번호는 가린다 (2026-09-14).
        await createAdminAuditLog({
          adminUserId: ctx.user.id,
          action: "reminder.status.update",
          beforeValue: subscription.status,
          afterValue: input.status,
          note: `문자 알림 ${subscription.id} · ${maskPhoneForAudit(
            subscription.phone
          )} · ${subscription.memorialName} (${subscription.memorialSlug})`,
        });
        return { success: true };
      }),

    subscribe: publicProcedure
      .input(reminderSubscribeInput)
      .mutation(async ({ ctx, input }) => {
        if (!MEMORIAL_REMINDER_SIGNUP_ENABLED) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "지금은 추도일 알림 신청을 받지 않습니다.",
          });
        }

        consumePublicSubmissionAttempt(
          reminderSubscriptionLimiter,
          passwordAttemptKey(ctx.req, "reminder-subscribe"),
          "문자 알림 요청이 너무 많습니다. 내일 다시 시도해 주세요."
        );
        consumePublicSubmissionAttempt(
          reminderPhoneLimiter,
          subjectAttemptKey(
            `reminder-phone:${input.phone.replace(/\D/g, "")}`
          ),
          "이 번호로는 오늘 더 신청할 수 없습니다. 내일 다시 시도해 주세요."
        );
        consumePublicSubmissionAttempt(
          reminderDailyTotalLimiter,
          subjectAttemptKey("reminder-daily-total"),
          "오늘은 알림 신청이 많아 더 받을 수 없습니다. 내일 다시 시도해 주세요."
        );

        // 비공개 추모관은 입장한 사람만 신청할 수 있다. 확인 문자에 고인 성함과
        // 추도일이 담기므로, 주소만 짐작해서 신청하면 비공개 정보가 새어 나간다.
        const memorial = await getPublicMemorialBySlug(input.memorialSlug);
        if (
          !memorial ||
          !(await canUserReadMemorialWithFamily(
            memorial,
            input.accessToken,
            ctx.user
          ))
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "추모관을 찾을 수 없습니다.",
          });
        }

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
          // 실제 원인은 서버 로그에만 남긴다. "SOLAPI 발신번호가 설정되지
          // 않았습니다" 같은 내부 사정이 유가족 화면에 그대로 보이면
          // 무슨 말인지도 모르고 불안하기만 하다.
          console.error("[Reminder] 확인 문자 발송 실패", error);
          return {
            ...subscribed,
            confirmationSent: false,
            confirmationMessage:
              "확인 문자는 보내드리지 못했지만, 추도일 알림 신청은 저장되었습니다.",
          };
        }
      }),
  }),

  gallery: galleryRouter,
  video: videoRouter,
  book: bookRouter,
  upload: uploadRouter,
  kioskPoster: kioskPosterRouter,
  kioskInquiry: kioskInquiryRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
