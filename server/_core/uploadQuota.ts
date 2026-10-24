import fs from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  accountUploads,
  accountUploadUsage,
  uploadQuotaBootstrap,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut, UPLOAD_DIR } from "../storage";
import { thumbnailPathFor } from "../../shared/thumbnail";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const GIB = 1024 ** 3;

function positiveLimit(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error("Invalid upload quota configuration");
  return parsed;
}

export function uploadQuotaLimits() {
  return {
    bytes: positiveLimit(process.env.UPLOAD_QUOTA_BYTES, GIB),
    dailyCount: positiveLimit(process.env.UPLOAD_DAILY_LIMIT, 100),
  };
}

export function seoulUploadDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function affectedRows(result: unknown) {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: number })?.affectedRows ?? 0);
}

export async function reserveAccountUpload(
  tx: Transaction,
  userId: number,
  bytes: number,
  now = new Date(),
  limits = uploadQuotaLimits()
) {
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > limits.bytes)
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "사진 저장 공간이 가득 찼습니다.",
    });
  const [user] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "다시 로그인해 주세요.",
    });
  await tx
    .insert(accountUploadUsage)
    .values({ userId })
    .onDuplicateKeyUpdate({ set: { userId } });
  const day = seoulUploadDay(now);
  // The conditional UPDATE serializes competing requests on one account row.
  const result = await tx.execute(sql`
    UPDATE account_upload_usage
    SET usedBytes = usedBytes + ${bytes},
        dayCount = CASE WHEN dayKey = ${day} THEN dayCount + 1 ELSE 1 END,
        dayKey = ${day}
    WHERE userId = ${userId}
      AND usedBytes + ${bytes} <= ${limits.bytes}
      AND (dayKey <> ${day} OR dayCount < ${limits.dailyCount})
  `);
  if (affectedRows(result) === 1) return;
  const [usage] = await tx
    .select()
    .from(accountUploadUsage)
    .where(eq(accountUploadUsage.userId, userId));
  if (usage?.dayKey === day && usage.dayCount >= limits.dailyCount)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "오늘은 더 올릴 수 없습니다. 내일 다시 올려 주세요.",
    });
  throw new TRPCError({
    code: "PAYLOAD_TOO_LARGE",
    message:
      "사진 저장 공간이 가득 찼습니다. 보관 기간이 지난 사진이 정리된 뒤 다시 올려 주세요.",
  });
}

export async function storeAccountImage({
  userId,
  key,
  buffer,
  mimeType,
  extraBytes = 0,
  tx,
}: {
  userId: number;
  key: string;
  buffer: Buffer;
  mimeType: string;
  extraBytes?: number;
  tx?: Transaction;
}) {
  let storedKey: string | undefined;
  const store = async (db: Transaction) => {
    await reserveAccountUpload(db, userId, buffer.length + extraBytes);
    const stored = await storagePut(key, buffer, mimeType);
    storedKey = stored.key;
    await db.insert(accountUploads).values({
      userId,
      storageKey: stored.key,
      bytes: buffer.length + extraBytes,
    });
    return stored;
  };
  const db = tx ?? (await getDb());
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "잠시 후 다시 시도해 주세요.",
    });
  try {
    return tx ? await store(tx) : await db.transaction(store);
  } catch (error) {
    // A rolled-back reservation cannot leave an untracked file on disk.
    if (storedKey) fs.rmSync(path.join(UPLOAD_DIR, storedKey), { force: true });
    throw error;
  }
}

export async function markPendingAccountUploads(keys: string[]) {
  if (!keys.length) return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(accountUploads)
    .set({ purgePendingAt: new Date() })
    .where(
      and(
        inArray(accountUploads.storageKey, keys),
        isNull(accountUploads.purgedAt)
      )
    );
}

export async function markPurgedAccountUploads(keys: string[]) {
  if (!keys.length) return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async tx => {
    const rows = await tx
      .select({
        id: accountUploads.id,
        userId: accountUploads.userId,
        bytes: accountUploads.bytes,
      })
      .from(accountUploads)
      .where(
        and(
          inArray(accountUploads.storageKey, keys),
          isNull(accountUploads.purgedAt)
        )
      )
      .for("update");
    for (const row of rows) {
      const result = await tx
        .update(accountUploads)
        .set({ purgedAt: new Date() })
        .where(
          and(eq(accountUploads.id, row.id), isNull(accountUploads.purgedAt))
        );
      if (affectedRows(result) === 1)
        await tx
          .update(accountUploadUsage)
          .set({
            usedBytes: sql`GREATEST(0, ${accountUploadUsage.usedBytes} - ${row.bytes})`,
          })
          .where(eq(accountUploadUsage.userId, row.userId));
    }
  });
}

/** Used when a later photo/poster DB insert fails after the file was stored. */
export async function cancelAccountImage(key: string) {
  if (!key || key.includes("..") || path.isAbsolute(key))
    throw new Error("Invalid storage key");
  await markPendingAccountUploads([key]);
  fs.rmSync(path.join(UPLOAD_DIR, key), { force: true });
  fs.rmSync(path.join(UPLOAD_DIR, thumbnailPathFor(key)), { force: true });
  await markPurgedAccountUploads([key]);
}

async function finishMissingPendingUploads() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const pending = await db
    .select({ key: accountUploads.storageKey })
    .from(accountUploads)
    .where(
      and(
        sql`${accountUploads.purgePendingAt} IS NOT NULL`,
        isNull(accountUploads.purgedAt)
      )
    );
  const trashRoot = path.join(UPLOAD_DIR, ".trash");
  const days = fs.existsSync(trashRoot)
    ? fs
        .readdirSync(trashRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && /^\d{8}$/.test(entry.name))
        .map(entry => entry.name)
    : [];
  const missing = pending
    .map(row => row.key)
    .filter(
      key =>
        !fs.existsSync(path.join(UPLOAD_DIR, key)) &&
        !days.some(day => fs.existsSync(path.join(trashRoot, day, key)))
    );
  for (let i = 0; i < missing.length; i += 200)
    await markPurgedAccountUploads(missing.slice(i, i + 200));
}

function resultRows(
  result: unknown
): { userId: number; storageKey: string; createdAt: Date }[] {
  const rows = Array.isArray(result) ? result[0] : result;
  return Array.isArray(rows)
    ? (rows as { userId: number; storageKey: string; createdAt: Date }[])
    : [];
}

/** Missing files are skipped; other read failures must leave the bootstrap retryable. */
function legacyFileBytes(key: string, trashDays: string[]): number | undefined {
  const candidates = [
    UPLOAD_DIR,
    ...trashDays.map(day => path.join(UPLOAD_DIR, ".trash", day)),
  ];
  for (const root of candidates) {
    let bytes: number;
    try {
      bytes = fs.statSync(path.join(root, key)).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    try {
      bytes += fs.statSync(path.join(root, thumbnailPathFor(key))).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return bytes;
  }
  return undefined;
}

/** Fail startup before accepting requests if migrations are absent. */
export async function prepareUploadQuota() {
  const db = await getDb();
  if (!db) throw new Error("업로드 상한: DB 연결이 없습니다.");
  try {
    await db.execute(sql`SELECT id FROM account_uploads LIMIT 0`);
  } catch (error) {
    if (
      (error as { cause?: { code?: string }; code?: string }).code !==
        "ER_NO_SUCH_TABLE" &&
      (error as { cause?: { code?: string } }).cause?.code !==
        "ER_NO_SUCH_TABLE"
    )
      throw error;
    throw new Error(
      "업로드 상한: account_uploads 표가 없습니다. 마이그레이션 0033 먼저 적용해 주세요."
    );
  }
  try {
    await db.execute(sql`SELECT userId FROM account_upload_usage LIMIT 0`);
    await db.execute(sql`SELECT id FROM upload_quota_bootstrap LIMIT 0`);
    await db.execute(sql`SELECT purgePendingAt FROM account_uploads LIMIT 0`);
  } catch {
    throw new Error("업로드 상한: 마이그레이션 0034 먼저 적용해 주세요.");
  }
  await db.transaction(async tx => {
    await tx
      .insert(uploadQuotaBootstrap)
      .values({ id: 1 })
      .onDuplicateKeyUpdate({ set: { id: 1 } });
    const [state] = await tx
      .select()
      .from(uploadQuotaBootstrap)
      .where(eq(uploadQuotaBootstrap.id, 1))
      .for("update");
    if (state?.completedAt) return;
    // Existing memorial images belong to the memorial owner. Duplicates are ignored.
    const legacy = resultRows(
      await tx.execute(sql`
      SELECT m.createdByUserId AS userId, p.photoUrl AS storageKey, p.createdAt AS createdAt
      FROM memorial_gallery_photos p JOIN memorials m ON m.id = p.memorialId
      UNION SELECT m.createdByUserId, p.photoUrl, p.createdAt
      FROM memorial_family_room_photos p JOIN memorial_family_rooms r ON r.id = p.familyRoomId
      JOIN memorials m ON m.id = r.memorialId
      UNION SELECT m.createdByUserId, b.coverPhotoUrl, b.createdAt
      FROM memorial_books b JOIN memorials m ON m.id = b.memorialId
      UNION SELECT m.createdByUserId, p.photoUrl, p.createdAt
      FROM memorial_book_pages p JOIN memorial_books b ON b.id = p.bookId
      JOIN memorials m ON m.id = b.memorialId
      UNION SELECT a.adminUserId, k.imageUrl, k.createdAt
      FROM kiosk_posters k JOIN admin_audit_logs a
        ON a.action = 'kioskPoster.create' AND a.afterValue = k.imageKey
    `)
    );
    let skippedOwners = 0;
    let fileReadErrors = 0;
    const trashRoot = path.join(UPLOAD_DIR, ".trash");
    let trashDays: string[] = [];
    try {
      trashDays = fs.existsSync(trashRoot)
        ? fs
            .readdirSync(trashRoot, { withFileTypes: true })
            .filter(entry => entry.isDirectory() && /^\d{8}$/.test(entry.name))
            .map(entry => entry.name)
        : [];
    } catch (error) {
      fileReadErrors += 1;
      console.warn(
        "[UploadQuota] 휴지통 목록을 읽지 못해 다음 시작 때 다시 시도합니다:",
        error
      );
    }
    for (const row of legacy) {
      if (!row.userId) {
        skippedOwners += 1;
        continue;
      }
      const key = row.storageKey?.match(/\/uploads\/([A-Za-z0-9._\-/%]+)/)?.[1];
      if (!key || key.includes("..")) continue;
      const file = path.resolve(UPLOAD_DIR, key);
      if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) continue;
      let bytes: number;
      try {
        const size = legacyFileBytes(key, trashDays);
        if (size === undefined) continue;
        bytes = size;
      } catch (error) {
        fileReadErrors += 1;
        console.warn(`[UploadQuota] 파일 크기를 읽지 못함 (${key}):`, error);
        continue;
      }
      await tx
        .insert(accountUploads)
        .values({
          userId: Number(row.userId),
          storageKey: key,
          bytes,
          createdAt: new Date(row.createdAt),
        })
        .onDuplicateKeyUpdate({ set: { storageKey: key } });
    }
    if (skippedOwners > 0)
      console.warn(
        `[UploadQuota] 소유자 없는 사진 ${skippedOwners}건은 건너뛰었습니다.`
      );
    const totals = await tx
      .select({
        userId: accountUploads.userId,
        bytes: sql<number>`SUM(${accountUploads.bytes})`,
      })
      .from(accountUploads)
      .where(isNull(accountUploads.purgedAt))
      .groupBy(accountUploads.userId);
    const today = seoulUploadDay(new Date());
    const recent = await tx
      .select({
        userId: accountUploads.userId,
        createdAt: accountUploads.createdAt,
      })
      .from(accountUploads)
      .where(
        sql`${accountUploads.createdAt} >= ${new Date(Date.now() - 2 * 86400000)}`
      );
    const daily = new Map<number, number>();
    for (const row of recent)
      if (seoulUploadDay(row.createdAt) === today)
        daily.set(row.userId, (daily.get(row.userId) ?? 0) + 1);
    for (const total of totals)
      await tx
        .insert(accountUploadUsage)
        .values({
          userId: total.userId,
          usedBytes: Number(total.bytes),
          dayKey: today,
          dayCount: daily.get(total.userId) ?? 0,
        })
        .onDuplicateKeyUpdate({
          set: {
            usedBytes: Number(total.bytes),
            dayKey: today,
            dayCount: daily.get(total.userId) ?? 0,
          },
        });
    if (fileReadErrors > 0) {
      console.warn(
        `[UploadQuota] 파일 읽기 오류 ${fileReadErrors}건으로 백필을 다음 시작 때 다시 시도합니다.`
      );
    } else {
      await tx
        .update(uploadQuotaBootstrap)
        .set({ completedAt: new Date() })
        .where(eq(uploadQuotaBootstrap.id, 1));
    }
  });
  await finishMissingPendingUploads();
}
