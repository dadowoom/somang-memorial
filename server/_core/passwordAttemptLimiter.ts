import { createHash } from "node:crypto";
import type { Request } from "express";

export const PASSWORD_FAILURE_LIMIT = 5;
export const PASSWORD_FAILURE_WINDOW_MS = 10 * 60 * 1000;
export const PASSWORD_BLOCK_MS = 10 * 60 * 1000;

type PasswordAttemptRecord = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number | null;
  lastSeenAt: number;
};

type PasswordAttemptLimiterOptions = {
  failureLimit?: number;
  failureWindowMs?: number;
  blockMs?: number;
  maxEntries?: number;
};

export type PasswordAttemptCheck =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Keeps failed password attempts in process memory only. Passwords are never
 * included in the key or stored in a record.
 */
export function createPasswordAttemptLimiter({
  failureLimit = PASSWORD_FAILURE_LIMIT,
  failureWindowMs = PASSWORD_FAILURE_WINDOW_MS,
  blockMs = PASSWORD_BLOCK_MS,
  maxEntries = 10_000,
}: PasswordAttemptLimiterOptions = {}) {
  const records = new Map<string, PasswordAttemptRecord>();

  const isExpired = (record: PasswordAttemptRecord, now: number) =>
    record.blockedUntil === null &&
    now - record.windowStartedAt >= failureWindowMs;

  const cleanup = (now: number) => {
    records.forEach((record, key) => {
      if (
        isExpired(record, now) ||
        (record.blockedUntil !== null && record.blockedUntil <= now)
      ) {
        records.delete(key);
      }
    });

    while (records.size > maxEntries) {
      let oldestKey: string | undefined;
      let oldestSeenAt = Number.POSITIVE_INFINITY;

      records.forEach((record, key) => {
        if (record.lastSeenAt < oldestSeenAt) {
          oldestKey = key;
          oldestSeenAt = record.lastSeenAt;
        }
      });

      if (!oldestKey) return;
      records.delete(oldestKey);
    }
  };

  return {
    check(key: string, now = Date.now()): PasswordAttemptCheck {
      cleanup(now);
      const record = records.get(key);

      if (!record || record.blockedUntil === null) {
        return { allowed: true };
      }

      record.lastSeenAt = now;
      return {
        allowed: false,
        retryAfterMs: Math.max(0, record.blockedUntil - now),
      };
    },

    recordFailure(key: string, now = Date.now()) {
      cleanup(now);
      const existing = records.get(key);

      if (!existing) {
        records.set(key, {
          failures: 1,
          windowStartedAt: now,
          blockedUntil: failureLimit === 1 ? now + blockMs : null,
          lastSeenAt: now,
        });
        return;
      }

      if (existing.blockedUntil !== null) {
        existing.lastSeenAt = now;
        return;
      }

      existing.failures += 1;
      existing.lastSeenAt = now;
      if (existing.failures >= failureLimit) {
        existing.blockedUntil = now + blockMs;
      }
    },

    recordSuccess(key: string) {
      records.delete(key);
    },
  };
}

export function clientAddress(req: Pick<Request, "headers" | "socket">) {
  // Forwarded headers are only trusted when an administrator explicitly enables
  // this for a reverse proxy. This prevents a direct client from spoofing an IP.
  //
  // Only the LAST entry is trusted. nginx ($proxy_add_x_forwarded_for) appends
  // the real client address to whatever the client sent, so the leftmost entry
  // is attacker-controlled: a fresh fake value per request would reset every
  // limit. This matches Express `trust proxy 1` (one proxy in front).
  if (process.env.TRUST_PROXY === "true") {
    const forwardedFor = req.headers["x-forwarded-for"];
    const joined = Array.isArray(forwardedFor)
      ? forwardedFor.join(",")
      : forwardedFor;
    const lastAddress = joined?.split(",").pop()?.trim();
    if (lastAddress) return lastAddress;
  }

  return req.socket.remoteAddress ?? "unknown";
}

// 서식 문자(폭 0 공백 등)와 빈칸. tsconfig 대상이 낮아 u 플래그 글자식을
// 직접 쓸 수 없으므로 생성자로 만든다.
const INVISIBLE_OR_SPACE = new RegExp("[\\p{Cf}\\p{White_Space}]", "gu");

/**
 * 시도 횟수를 셀 이름의 모양을 맞춘다 (2026-09-25). 대소문자, 호환 문자(전각 등),
 * 보이지 않는 글자와 빈칸이 달라도 같은 이름으로 센다.
 */
export function normalizeAttemptSubject(value: string) {
  return value.normalize("NFKC").replace(INVISIBLE_OR_SPACE, "").toLowerCase();
}

/** Creates a key for a protected item alone (e.g. one account), regardless of client. */
export function subjectAttemptKey(subject: string) {
  return createHash("sha256")
    .update(`subject\u0000${subject}`)
    .digest("base64url");
}

/** Creates a non-reversible, in-memory key for one client and protected item. */
export function passwordAttemptKey(req: Request, subject: string) {
  return createHash("sha256")
    .update(`${clientAddress(req)}\u0000${subject}`)
    .digest("base64url");
}
