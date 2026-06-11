import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertAdminAuditLog,
  InsertMemorialBook,
  InsertMemorialBookPage,
  InsertMemorialGalleryPhoto,
  InsertMemorial,
  InsertUser,
  InsertMemorialVideo,
  adminAuditLogs,
  memorialBookPages,
  memorialBooks,
  memorialFamilyRooms,
  memorialGalleryPhotos,
  memorialLetters,
  memorialReminderSubscriptions,
  memorialVideos,
  memorials,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "phone",
      "passwordHash",
      "loginMethod",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.approvalStatus !== undefined) {
      values.approvalStatus = user.approvalStatus;
      updateSet.approvalStatus = user.approvalStatus;
    }
    if (user.approvedAt !== undefined) {
      values.approvedAt = user.approvedAt;
      updateSet.approvedAt = user.approvedAt;
    } else if (user.openId === ENV.ownerOpenId) {
      values.approvalStatus = "approved";
      updateSet.approvalStatus = "approved";
      values.approvedAt = new Date();
      updateSet.approvedAt = values.approvedAt;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashUserPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyUserPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;

  const expected = Buffer.from(storedHash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}

function createLocalOpenId(email: string) {
  const digest = createHash("sha256").update(email).digest("hex").slice(0, 56);
  return `local:${digest}`;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function hasAdminUser() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check admin user: database not available");
    return false;
  }

  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  return result.length > 0;
}

export async function createLocalUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    return null;
  }

  const firstAdmin = !(await hasAdminUser());
  const now = new Date();

  await db.insert(users).values({
    openId: createLocalOpenId(email),
    name: input.name,
    email,
    phone: input.phone || null,
    passwordHash: hashUserPassword(input.password),
    loginMethod: "local",
    role: firstAdmin ? "admin" : "user",
    approvalStatus: "approved",
    approvedAt: now,
    lastSignedIn: now,
  });

  const created = await getUserByEmail(email);
  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}

export async function listAdminUsers(limit = 500) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      loginMethod: users.loginMethod,
      role: users.role,
      approvalStatus: users.approvalStatus,
      approvedAt: users.approvedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit);
}

export async function getAdminUserById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function countAdminUsers() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  return result.length;
}

export async function updateAdminUserRole(
  id: number,
  role: "user" | "admin"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateAdminUserStatus(
  id: number,
  approvalStatus: "approved" | "rejected"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(users)
    .set({
      approvalStatus,
      approvedAt: approvalStatus === "approved" ? new Date() : null,
    })
    .where(eq(users.id, id));
}

export async function createAdminAuditLog(input: InsertAdminAuditLog) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.insert(adminAuditLogs).values(input);
}

export async function listAdminAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const adminUser = alias(users, "admin_user");
  const targetUser = alias(users, "target_user");

  return db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      beforeValue: adminAuditLogs.beforeValue,
      afterValue: adminAuditLogs.afterValue,
      note: adminAuditLogs.note,
      createdAt: adminAuditLogs.createdAt,
      adminUserId: adminAuditLogs.adminUserId,
      targetUserId: adminAuditLogs.targetUserId,
      adminName: adminUser.name,
      adminEmail: adminUser.email,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
    })
    .from(adminAuditLogs)
    .leftJoin(adminUser, eq(adminAuditLogs.adminUserId, adminUser.id))
    .leftJoin(targetUser, eq(adminAuditLogs.targetUserId, targetUser.id))
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .limit(limit);
}

export function normalizeMemorialSlug(name: string, requestedSlug?: string) {
  const source = (requestedSlug || name || "memorial").trim().toLowerCase();
  const normalized = source
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `memorial-${Date.now()}`;
}

export async function createMemorial(input: InsertMemorial) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const baseSlug = normalizeMemorialSlug(input.name, input.slug);
  let slug = baseSlug;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const existing = await db
      .select({ id: memorials.id })
      .from(memorials)
      .where(eq(memorials.slug, slug))
      .limit(1);

    if (existing.length === 0) break;
    slug = `${baseSlug}-${suffix}`;
  }

  await db.insert(memorials).values({
    ...input,
    slug,
    status: input.status ?? "published",
  });

  const created = await db
    .select()
    .from(memorials)
    .where(eq(memorials.slug, slug))
    .limit(1);

  if (!created[0]) {
    throw new Error("Failed to load created memorial");
  }

  return created[0];
}

export async function listPublicMemorials() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: memorials.id,
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      verse: memorials.verse,
      verseRef: memorials.verseRef,
      summary: memorials.summary,
      status: memorials.status,
      createdAt: memorials.createdAt,
    })
    .from(memorials)
    .where(eq(memorials.visibility, "public"))
    .orderBy(desc(memorials.createdAt))
    .limit(100);
}

export async function searchPublicMemorials(keyword: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const normalizedKeyword = keyword.trim();
  if (normalizedKeyword.length < 2) return [];

  return db
    .select({
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      summary: memorials.summary,
      visibility: memorials.visibility,
    })
    .from(memorials)
    .where(like(memorials.name, `%${normalizedKeyword}%`))
    .orderBy(desc(memorials.createdAt))
    .limit(12);
}

export async function listAdminMemorials() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: memorials.id,
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      familyContact: memorials.familyContact,
      familyPhone: memorials.familyPhone,
      createdByUserId: memorials.createdByUserId,
      visibility: memorials.visibility,
      status: memorials.status,
      memorialDay: memorials.memorialDay,
      createdAt: memorials.createdAt,
      updatedAt: memorials.updatedAt,
    })
    .from(memorials)
    .orderBy(desc(memorials.updatedAt), desc(memorials.createdAt))
    .limit(500);
}

export async function listUserMemorials(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: memorials.id,
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      familyContact: memorials.familyContact,
      familyPhone: memorials.familyPhone,
      visibility: memorials.visibility,
      status: memorials.status,
      memorialDay: memorials.memorialDay,
      createdAt: memorials.createdAt,
      updatedAt: memorials.updatedAt,
    })
    .from(memorials)
    .where(eq(memorials.createdByUserId, userId))
    .orderBy(desc(memorials.updatedAt), desc(memorials.createdAt))
    .limit(200);
}

export async function getAdminMemorialBySlug(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select()
    .from(memorials)
    .where(eq(memorials.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getEditableMemorialBySlug(input: {
  slug: string;
  userId: number;
  isAdmin: boolean;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const whereClause = input.isAdmin
    ? eq(memorials.slug, input.slug)
    : and(
        eq(memorials.slug, input.slug),
        eq(memorials.createdByUserId, input.userId)
      );

  const result = await db.select().from(memorials).where(whereClause).limit(1);

  return result[0] ?? null;
}

export async function getAdminMemorialById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select()
    .from(memorials)
    .where(eq(memorials.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getPublicMemorialBySlug(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({
      id: memorials.id,
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      verse: memorials.verse,
      verseRef: memorials.verseRef,
      summary: memorials.summary,
      summaryDisplaySize: memorials.summaryDisplaySize,
      story: memorials.story,
      storyDisplaySize: memorials.storyDisplaySize,
      servicePlace: memorials.servicePlace,
      serviceTime: memorials.serviceTime,
      memorialDay: memorials.memorialDay,
      visibility: memorials.visibility,
      accessPasswordHash: memorials.accessPasswordHash,
      createdByUserId: memorials.createdByUserId,
      status: memorials.status,
      timelineJson: memorials.timelineJson,
      createdAt: memorials.createdAt,
    })
    .from(memorials)
    .where(eq(memorials.slug, slug))
    .limit(1);

  const memorial = result[0];
  if (!memorial) return null;
  return memorial;
}

export async function updateMemorial(
  id: number,
  data: Partial<InsertMemorial>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.update(memorials).set(data).where(eq(memorials.id, id));
}

export function hashFamilyRoomPassword(password: string) {
  return createHash("sha256").update(`somang-family:${password}`).digest("hex");
}

export function hashMemorialAccessPassword(password: string) {
  return createHash("sha256")
    .update(`somang-memorial-access:${password}`)
    .digest("hex");
}

export function createMemorialAccessToken(
  slug: string,
  accessPasswordHash: string
) {
  return createHash("sha256")
    .update(`somang-memorial-token:${slug}:${accessPasswordHash}`)
    .digest("hex");
}

export function canReadMemorial(
  memorial: {
    slug: string;
    visibility: string;
    accessPasswordHash: string | null;
  },
  accessToken?: string | null
) {
  if (memorial.visibility !== "private") return true;
  if (!memorial.accessPasswordHash || !accessToken) return false;
  return (
    accessToken ===
    createMemorialAccessToken(memorial.slug, memorial.accessPasswordHash)
  );
}

export function canUserReadMemorial(
  memorial: {
    slug: string;
    visibility: string;
    accessPasswordHash: string | null;
    createdByUserId?: number | null;
  },
  accessToken?: string | null,
  user?: { id: number; role: string } | null
) {
  if (user?.role === "admin") return true;
  if (user && memorial.createdByUserId === user.id) return true;
  return canReadMemorial(memorial, accessToken);
}

export async function getMemorialAccessStatus(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({
      slug: memorials.slug,
      name: memorials.name,
      role: memorials.role,
      birthDate: memorials.birthDate,
      deathDate: memorials.deathDate,
      church: memorials.church,
      summary: memorials.summary,
      visibility: memorials.visibility,
      accessPasswordHash: memorials.accessPasswordHash,
    })
    .from(memorials)
    .where(eq(memorials.slug, slug))
    .limit(1);

  const memorial = result[0];
  if (!memorial) return null;

  return {
    slug: memorial.slug,
    name: memorial.name,
    role: memorial.role,
    birthDate: memorial.birthDate,
    deathDate: memorial.deathDate,
    church: memorial.church,
    summary: memorial.summary,
    visibility: memorial.visibility,
    isPrivate: memorial.visibility === "private",
    requiresPassword:
      memorial.visibility === "private" && Boolean(memorial.accessPasswordHash),
    href: `/memorial/${memorial.slug}`,
  };
}

export async function verifyMemorialAccessPassword(input: {
  slug: string;
  password: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({
      slug: memorials.slug,
      name: memorials.name,
      visibility: memorials.visibility,
      accessPasswordHash: memorials.accessPasswordHash,
    })
    .from(memorials)
    .where(eq(memorials.slug, input.slug))
    .limit(1);

  const memorial = result[0];
  if (!memorial) return null;

  if (memorial.visibility !== "private") {
    return {
      slug: memorial.slug,
      name: memorial.name,
      href: `/memorial/${memorial.slug}`,
      accessToken: null,
    };
  }

  if (
    !memorial.accessPasswordHash ||
    memorial.accessPasswordHash !== hashMemorialAccessPassword(input.password)
  ) {
    return false;
  }

  return {
    slug: memorial.slug,
    name: memorial.name,
    href: `/memorial/${memorial.slug}`,
    accessToken: createMemorialAccessToken(
      memorial.slug,
      memorial.accessPasswordHash
    ),
  };
}

export async function getMemorialFamilyRoomStatus(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({
      memorialId: memorials.id,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      roomId: memorialFamilyRooms.id,
    })
    .from(memorials)
    .leftJoin(
      memorialFamilyRooms,
      eq(memorialFamilyRooms.memorialId, memorials.id)
    )
    .where(eq(memorials.slug, slug))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    memorialId: row.memorialId,
    memorialSlug: row.memorialSlug,
    memorialName: row.memorialName,
    enabled: Boolean(row.roomId),
    href: `/memorial/${row.memorialSlug}/family`,
  };
}

export async function verifyMemorialFamilyRoomPassword(
  slug: string,
  password: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select({
      memorialId: memorials.id,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
      church: memorials.church,
      title: memorialFamilyRooms.title,
      intro: memorialFamilyRooms.intro,
      passwordHash: memorialFamilyRooms.passwordHash,
    })
    .from(memorials)
    .innerJoin(
      memorialFamilyRooms,
      eq(memorialFamilyRooms.memorialId, memorials.id)
    )
    .where(eq(memorials.slug, slug))
    .limit(1);

  const room = result[0];
  if (!room) return null;

  if (room.passwordHash !== hashFamilyRoomPassword(password)) {
    return false;
  }

  return {
    memorialId: room.memorialId,
    memorialSlug: room.memorialSlug,
    memorialName: room.memorialName,
    memorialRole: room.memorialRole,
    church: room.church,
    title: room.title,
    intro: room.intro,
    notes: [
      {
        title: "가족의 기억",
        body: "공개 추모관에 모두 담기 어려운 사적인 기억과 이야기를 가족끼리 천천히 남길 수 있습니다.",
      },
      {
        title: "비공개 기록",
        body: "사진, 편지, 예배 준비 메모처럼 가족에게만 필요한 기록을 정리해둘 공간입니다.",
      },
      {
        title: "함께 이어가기",
        body: "가족들이 같은 링크와 비밀번호로 들어와 서로의 마음을 확인할 수 있습니다.",
      },
    ],
  };
}

export async function createMemorialLetter(input: {
  memorialSlug?: string;
  recipientName?: string;
  recipientRole?: string;
  author: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  if (input.memorialSlug) {
    const memorial = await db
      .select({
        id: memorials.id,
        slug: memorials.slug,
        name: memorials.name,
        role: memorials.role,
      })
      .from(memorials)
      .where(eq(memorials.slug, input.memorialSlug))
      .limit(1);

    if (!memorial[0]) return null;

    await db.insert(memorialLetters).values({
      memorialId: memorial[0].id,
      recipientName: memorial[0].name,
      recipientRole: memorial[0].role,
      author: input.author,
      content: input.content,
      status: "published",
    });

    const created = await db
      .select({
        id: memorialLetters.id,
        author: memorialLetters.author,
        content: memorialLetters.content,
        createdAt: memorialLetters.createdAt,
        memorialId: memorialLetters.memorialId,
        memorialSlug: memorials.slug,
        memorialName: memorials.name,
        memorialRole: memorials.role,
      })
      .from(memorialLetters)
      .innerJoin(memorials, eq(memorialLetters.memorialId, memorials.id))
      .where(eq(memorialLetters.memorialId, memorial[0].id))
      .orderBy(desc(memorialLetters.id))
      .limit(1);

    return created[0] ?? null;
  }

  const recipientName = input.recipientName?.trim();
  if (!recipientName) return null;

  await db.insert(memorialLetters).values({
    memorialId: null,
    recipientName,
    recipientRole: input.recipientRole?.trim() || null,
    author: input.author,
    content: input.content,
    status: "published",
  });

  const created = await db
    .select({
      id: memorialLetters.id,
      author: memorialLetters.author,
      content: memorialLetters.content,
      createdAt: memorialLetters.createdAt,
      memorialId: memorialLetters.memorialId,
      memorialSlug: memorials.slug,
      memorialName: memorialLetters.recipientName,
      memorialRole: memorialLetters.recipientRole,
    })
    .from(memorialLetters)
    .leftJoin(memorials, eq(memorialLetters.memorialId, memorials.id))
    .where(
      and(
        isNull(memorialLetters.memorialId),
        eq(memorialLetters.author, input.author),
        eq(memorialLetters.recipientName, recipientName)
      )
    )
    .orderBy(desc(memorialLetters.id))
    .limit(1);

  return created[0] ?? null;
}

export function normalizeReminderPhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export async function createMemorialReminderSubscription(input: {
  memorialSlug: string;
  phone: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const normalizedPhone = normalizeReminderPhone(input.phone);
  const memorial = await db
    .select({
      id: memorials.id,
      slug: memorials.slug,
      name: memorials.name,
      memorialDay: memorials.memorialDay,
    })
    .from(memorials)
    .where(eq(memorials.slug, input.memorialSlug))
    .limit(1);

  const target = memorial[0];
  if (!target) return null;

  await db
    .insert(memorialReminderSubscriptions)
    .values({
      memorialId: target.id,
      phone: normalizedPhone,
      memorialDay: target.memorialDay || null,
      status: "active",
    })
    .onDuplicateKeyUpdate({
      set: {
        memorialDay: target.memorialDay || null,
        status: "active",
        consentAt: new Date(),
      },
    });

  return {
    memorialId: target.id,
    memorialSlug: target.slug,
    memorialName: target.name,
    phone: normalizedPhone,
    memorialDay: target.memorialDay || "추후 안내",
  };
}

export async function listMemorialLetters(memorialSlug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: memorialLetters.id,
      author: memorialLetters.author,
      content: memorialLetters.content,
      createdAt: memorialLetters.createdAt,
      memorialId: memorialLetters.memorialId,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
    })
    .from(memorialLetters)
    .innerJoin(memorials, eq(memorialLetters.memorialId, memorials.id))
    .where(
      and(
        eq(memorials.slug, memorialSlug),
        eq(memorialLetters.status, "published")
      )
    )
    .orderBy(desc(memorialLetters.createdAt), desc(memorialLetters.id))
    .limit(100);
}

export async function listRecentMemorialLetters(limit = 100) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const rows = await db
    .select({
      id: memorialLetters.id,
      author: memorialLetters.author,
      content: memorialLetters.content,
      createdAt: memorialLetters.createdAt,
      memorialId: memorialLetters.memorialId,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
      recipientName: memorialLetters.recipientName,
      recipientRole: memorialLetters.recipientRole,
    })
    .from(memorialLetters)
    .leftJoin(memorials, eq(memorialLetters.memorialId, memorials.id))
    .where(
      and(
        eq(memorialLetters.status, "published"),
        or(
          eq(memorials.visibility, "public"),
          isNull(memorialLetters.memorialId)
        )
      )
    )
    .orderBy(desc(memorialLetters.createdAt), desc(memorialLetters.id))
    .limit(limit);

  return rows.map(row => ({
    id: row.id,
    author: row.author,
    content: row.content,
    createdAt: row.createdAt,
    memorialId: row.memorialId,
    memorialSlug: row.memorialSlug,
    memorialName: row.memorialName ?? row.recipientName ?? "하늘",
    memorialRole: row.memorialRole ?? row.recipientRole ?? "",
  }));
}

export async function listAdminMemorialLetters(limit = 300) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const rows = await db
    .select({
      id: memorialLetters.id,
      author: memorialLetters.author,
      content: memorialLetters.content,
      status: memorialLetters.status,
      createdAt: memorialLetters.createdAt,
      memorialId: memorialLetters.memorialId,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
      memorialVisibility: memorials.visibility,
      recipientName: memorialLetters.recipientName,
      recipientRole: memorialLetters.recipientRole,
    })
    .from(memorialLetters)
    .leftJoin(memorials, eq(memorialLetters.memorialId, memorials.id))
    .orderBy(desc(memorialLetters.createdAt), desc(memorialLetters.id))
    .limit(limit);

  return rows.map(row => ({
    id: row.id,
    author: row.author,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    memorialId: row.memorialId,
    memorialSlug: row.memorialSlug,
    memorialName: row.memorialName ?? row.recipientName ?? "하늘",
    memorialRole: row.memorialRole ?? row.recipientRole ?? "",
    memorialVisibility: row.memorialVisibility ?? "standalone",
  }));
}

export async function updateMemorialLetterStatus(
  id: number,
  status: "published" | "hidden"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialLetters)
    .set({ status })
    .where(eq(memorialLetters.id, id));
}

export async function listAdminReminderSubscriptions(limit = 300) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select({
      id: memorialReminderSubscriptions.id,
      phone: memorialReminderSubscriptions.phone,
      memorialDay: memorialReminderSubscriptions.memorialDay,
      status: memorialReminderSubscriptions.status,
      consentAt: memorialReminderSubscriptions.consentAt,
      lastNotifiedYear: memorialReminderSubscriptions.lastNotifiedYear,
      lastNotifiedAt: memorialReminderSubscriptions.lastNotifiedAt,
      lastNotificationError:
        memorialReminderSubscriptions.lastNotificationError,
      createdAt: memorialReminderSubscriptions.createdAt,
      updatedAt: memorialReminderSubscriptions.updatedAt,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
      memorialVisibility: memorials.visibility,
    })
    .from(memorialReminderSubscriptions)
    .innerJoin(
      memorials,
      eq(memorialReminderSubscriptions.memorialId, memorials.id)
    )
    .orderBy(
      desc(memorialReminderSubscriptions.updatedAt),
      desc(memorialReminderSubscriptions.id)
    )
    .limit(limit);
}

export async function updateReminderSubscriptionStatus(
  id: number,
  status: "active" | "cancelled"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialReminderSubscriptions)
    .set({ status })
    .where(eq(memorialReminderSubscriptions.id, id));
}

function getSeoulDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { year, month, day };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseMemorialMonthDay(value: string | null) {
  if (!value) return null;

  const isoMatch = value.match(/\b\d{4}-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return { month: Number(isoMatch[1]), day: Number(isoMatch[2]) };
  }

  const koreanMatch = value.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanMatch) {
    return { month: Number(koreanMatch[1]), day: Number(koreanMatch[2]) };
  }

  const slashMatch = value.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (slashMatch) {
    return { month: Number(slashMatch[1]), day: Number(slashMatch[2]) };
  }

  return null;
}

export async function listDueReminderSubscriptions(
  date = new Date(),
  daysBefore = 1
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const targetDate = addDays(date, daysBefore);
  const target = getSeoulDateParts(targetDate);
  const notificationYear = target.year;

  const rows = await db
    .select({
      id: memorialReminderSubscriptions.id,
      phone: memorialReminderSubscriptions.phone,
      memorialDay: memorialReminderSubscriptions.memorialDay,
      lastNotifiedYear: memorialReminderSubscriptions.lastNotifiedYear,
      memorialSlug: memorials.slug,
      memorialName: memorials.name,
      memorialRole: memorials.role,
    })
    .from(memorialReminderSubscriptions)
    .innerJoin(
      memorials,
      eq(memorialReminderSubscriptions.memorialId, memorials.id)
    )
    .where(eq(memorialReminderSubscriptions.status, "active"))
    .limit(1000);

  return rows
    .filter(row => {
      if (row.lastNotifiedYear === notificationYear) return false;
      const day = parseMemorialMonthDay(row.memorialDay);
      return day?.month === target.month && day.day === target.day;
    })
    .map(row => ({ ...row, notificationYear }));
}

export async function markReminderNotificationSent(
  id: number,
  notificationYear: number,
  messageId: string | null
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialReminderSubscriptions)
    .set({
      lastNotifiedYear: notificationYear,
      lastNotifiedAt: new Date(),
      lastNotificationMessageId: messageId,
      lastNotificationError: null,
    })
    .where(eq(memorialReminderSubscriptions.id, id));
}

export async function markReminderNotificationFailed(
  id: number,
  errorMessage: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialReminderSubscriptions)
    .set({
      lastNotificationError: errorMessage.slice(0, 1000),
    })
    .where(eq(memorialReminderSubscriptions.id, id));
}

export async function listMemorialGalleryPhotos(memorialId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select()
    .from(memorialGalleryPhotos)
    .where(eq(memorialGalleryPhotos.memorialId, memorialId))
    .orderBy(
      asc(memorialGalleryPhotos.sortOrder),
      asc(memorialGalleryPhotos.createdAt)
    );
}

export async function createMemorialGalleryPhoto(
  data: InsertMemorialGalleryPhoto
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.insert(memorialGalleryPhotos).values(data);
}

export async function updateMemorialGalleryPhoto(
  id: number,
  data: Partial<InsertMemorialGalleryPhoto>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialGalleryPhotos)
    .set(data)
    .where(eq(memorialGalleryPhotos.id, id));
}

export async function setRepresentativeMemorialPhoto(
  memorialId: number,
  photoId: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialGalleryPhotos)
    .set({ isRepresentative: 0 })
    .where(eq(memorialGalleryPhotos.memorialId, memorialId));
  await db
    .update(memorialGalleryPhotos)
    .set({ isRepresentative: 1 })
    .where(eq(memorialGalleryPhotos.id, photoId));
}

export async function deleteMemorialGalleryPhoto(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .delete(memorialGalleryPhotos)
    .where(eq(memorialGalleryPhotos.id, id));
}

export async function listMemorialVideos(memorialId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select()
    .from(memorialVideos)
    .where(eq(memorialVideos.memorialId, memorialId))
    .orderBy(asc(memorialVideos.sortOrder), asc(memorialVideos.createdAt));
}

export async function createMemorialVideo(data: InsertMemorialVideo) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.insert(memorialVideos).values(data);
}

export async function updateMemorialVideo(
  id: number,
  data: Partial<InsertMemorialVideo>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.update(memorialVideos).set(data).where(eq(memorialVideos.id, id));
}

export async function deleteMemorialVideo(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.delete(memorialVideos).where(eq(memorialVideos.id, id));
}

export async function listMemorialBooks(memorialId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select()
    .from(memorialBooks)
    .where(eq(memorialBooks.memorialId, memorialId))
    .orderBy(asc(memorialBooks.sortOrder), asc(memorialBooks.createdAt));
}

export async function getMemorialBookById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  const result = await db
    .select()
    .from(memorialBooks)
    .where(eq(memorialBooks.id, id))
    .limit(1);
  return result[0];
}

export async function createMemorialBook(data: InsertMemorialBook) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.insert(memorialBooks).values(data);
}

export async function updateMemorialBook(
  id: number,
  data: Partial<InsertMemorialBook>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.update(memorialBooks).set(data).where(eq(memorialBooks.id, id));
}

export async function deleteMemorialBook(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.delete(memorialBookPages).where(eq(memorialBookPages.bookId, id));
  await db.delete(memorialBooks).where(eq(memorialBooks.id, id));
}

export async function listMemorialBookPages(bookId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  return db
    .select()
    .from(memorialBookPages)
    .where(eq(memorialBookPages.bookId, bookId))
    .orderBy(
      asc(memorialBookPages.dateYear),
      asc(memorialBookPages.dateMonth),
      asc(memorialBookPages.dateDay),
      asc(memorialBookPages.sortOrder)
    );
}

export async function createMemorialBookPage(data: InsertMemorialBookPage) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.insert(memorialBookPages).values(data);
}

export async function updateMemorialBookPage(
  id: number,
  data: Partial<InsertMemorialBookPage>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db
    .update(memorialBookPages)
    .set(data)
    .where(eq(memorialBookPages.id, id));
}

export async function deleteMemorialBookPage(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  await db.delete(memorialBookPages).where(eq(memorialBookPages.id, id));
}
