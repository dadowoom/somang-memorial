import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { accountUploads, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const GIB = 1024 ** 3;

function positiveLimit(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("Invalid upload quota configuration");
  }
  return parsed;
}

export function uploadQuotaLimits() {
  return {
    bytes: positiveLimit(process.env.UPLOAD_QUOTA_BYTES, GIB),
    dailyCount: positiveLimit(process.env.UPLOAD_DAILY_LIMIT, 100),
  };
}

export function assertUploadQuota(
  uploads: { bytes: number; createdAt: Date; purgedAt: Date | null }[],
  incomingBytes: number,
  now: Date,
  limits = uploadQuotaLimits()
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const dateKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  if (
    uploads.filter(upload => dateKey(upload.createdAt) === today).length >=
    limits.dailyCount
  ) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "오늘은 더 올릴 수 없습니다. 내일 다시 올려 주세요.",
    });
  }
  const used = uploads.reduce(
    (sum, upload) => sum + (upload.purgedAt ? 0 : upload.bytes),
    0
  );
  if (incomingBytes > limits.bytes - used) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message:
        "사진 저장 공간이 가득 찼습니다. 보관 기간이 지난 사진이 정리된 뒤 다시 올려 주세요.",
    });
  }
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
  const store = async (db: Transaction) => {
    // Lock the account, so uploads from two devices cannot pass the same limit.
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "다시 로그인해 주세요.",
      });
    const uploads = await db
      .select({
        bytes: accountUploads.bytes,
        createdAt: accountUploads.createdAt,
        purgedAt: accountUploads.purgedAt,
      })
      .from(accountUploads)
      .where(eq(accountUploads.userId, userId));
    assertUploadQuota(uploads, buffer.length + extraBytes, new Date());
    const stored = await storagePut(key, buffer, mimeType);
    await db.insert(accountUploads).values({
      userId,
      storageKey: stored.key,
      bytes: buffer.length + extraBytes,
    });
    return stored;
  };
  if (tx) return store(tx);
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "잠시 후 다시 시도해 주세요.",
    });
  return db.transaction(store);
}

export async function markPurgedAccountUploads(keys: string[]) {
  if (keys.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  for (let i = 0; i < keys.length; i += 200) {
    await db
      .update(accountUploads)
      .set({ purgedAt: new Date() })
      .where(inArray(accountUploads.storageKey, keys.slice(i, i + 200)));
  }
}
