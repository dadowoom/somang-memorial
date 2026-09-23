import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import {
  getDb,
  purgeExpiredKioskInquiries,
  purgeCancelledReminderSubscriptions,
  purgeOldReminderPhoneVerifications,
} from "../db";
import { UPLOAD_DIR } from "../storage";
import { thumbnailPathFor } from "../../shared/thumbnail";

/**
 * 지운 사진이 서버에 그대로 남던 문제 (2026-09-18 점검).
 *
 * 사진·포스터를 지우면 DB 줄만 없어지고 파일은 남아서, 주소를 아는 사람은 계속
 * 볼 수 있었다. 개인정보처리방침의 "복구할 수 없는 방법으로 삭제" 약속과도
 * 맞지 않았다.
 *
 * 지우는 곳마다 파일 삭제를 붙이면 빠뜨리는 곳이 생기고, 같은 파일을 두 곳에서
 * 쓰는 경우(예: 사진첩 사진을 대표 사진으로도 쓰는 것) 살아 있는 사진을 지울 수
 * 있다. 그래서 하루에 한 번 **DB 어디에도 적혀 있지 않은 파일**만 골라낸다.
 * DB 의 모든 글자 칸을 훑으므로 새 칸이 생겨도 따로 고칠 필요가 없다.
 *
 * 바로 지우지 않는다. 밖에서 열 수 없는 휴지통(.trash, 점으로 시작하는 폴더는
 * 내보내지 않는다)으로 옮기고, 30일 뒤에 완전히 지운다. 백업 보관 기간과 같다.
 */

export const TRASH_DIR_NAME = ".trash";
const DAY_MS = 24 * 60 * 60 * 1000;
/** 올린 직후 아직 저장 전인 파일을 건드리지 않도록 이만큼 지난 것만 본다. */
export const MIN_ORPHAN_AGE_MS = 2 * DAY_MS;
export const TRASH_RETENTION_MS = 30 * DAY_MS;
/** 한 번에 이보다 많이 치우려 하면 무언가 잘못된 것으로 보고 멈춘다. */
export const MAX_TRASH_RATIO = 0.3;
export const MAX_TRASH_COUNT = 300;

export type UploadCleanupMode = "off" | "dry-run" | "on";

export function uploadCleanupMode(
  value = process.env.UPLOAD_CLEANUP_MODE
): UploadCleanupMode {
  if (value === "off" || value === "on") return value;
  // 기본값은 "치울 목록만 로그에 남기기". 운영에서 목록을 확인한 뒤 on 으로 켠다.
  return "dry-run";
}

/** 글 안에 적힌 /uploads/... 주소에서 파일 경로(key)만 뽑는다. */
export function extractUploadKeys(text: string | null | undefined): string[] {
  if (!text) return [];
  const keys: string[] = [];
  const pattern = /\/uploads\/([A-Za-z0-9._\-/%]+)/g;
  for (const match of Array.from(text.matchAll(pattern))) {
    let key = match[1];
    try {
      key = decodeURIComponent(key);
    } catch {
      // 잘못된 % 표기는 그대로 둔다
    }
    // 기한이 적힌 주소(/uploads/s/<기한>.<서명>/...)가 글에 붙여 넣어졌어도
    // 실제 파일 이름으로 센다 (2026-09-23, protectedMedia.ts).
    keys.push(
      key.replace(/^\/+/, "").replace(/^s\/\d+\.[A-Za-z0-9_-]+\//, "")
    );
  }
  return keys;
}

export type StoredFile = { key: string; mtimeMs: number };

export type CleanupPlan =
  | { ok: true; toTrash: string[] }
  | { ok: false; reason: string; toTrash: string[] };

export function planUploadCleanup({
  files,
  referenced,
  now,
}: {
  files: StoredFile[];
  referenced: Set<string>;
  now: number;
}): CleanupPlan {
  const toTrash = files
    .filter(file => !referenced.has(file.key))
    .filter(file => now - file.mtimeMs >= MIN_ORPHAN_AGE_MS)
    .map(file => file.key)
    .sort();

  if (toTrash.length === 0) return { ok: true, toTrash };

  // 안전장치: DB 를 제대로 못 읽었거나 주소 형식이 바뀌면 "전부 안 쓰는 파일"로
  // 보일 수 있다. 그때 멀쩡한 사진을 치우지 않도록 멈춘다.
  if (referenced.size === 0) {
    return {
      ok: false,
      reason: "DB 에서 사진 주소를 하나도 찾지 못했습니다",
      toTrash,
    };
  }
  if (toTrash.length > MAX_TRASH_COUNT) {
    return {
      ok: false,
      reason: `치울 파일이 너무 많습니다 (${toTrash.length}개)`,
      toTrash,
    };
  }
  if (files.length >= 10 && toTrash.length / files.length > MAX_TRASH_RATIO) {
    return {
      ok: false,
      reason: `전체 ${files.length}개 중 ${toTrash.length}개를 치우려 해서 멈췄습니다`,
      toTrash,
    };
  }

  return { ok: true, toTrash };
}

function listStoredFiles(root: string): StoredFile[] {
  const files: StoredFile[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // 휴지통과 숨김 파일은 보지 않는다.
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push({
          key: path.relative(root, full).split(path.sep).join("/"),
          mtimeMs: fs.statSync(full).mtimeMs,
        });
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return files;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  // mysql2 드라이버는 [rows, fields] 를 돌려준다.
  const rows = Array.isArray(result) ? result[0] : result;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

/** DB 의 모든 글자 칸에서 /uploads/ 주소를 모은다. 읽기만 한다. */
export async function collectReferencedUploadKeys(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const columns = rowsOf(
    await db.execute(sql`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND DATA_TYPE IN ('char','varchar','tinytext','text','mediumtext','longtext','json')
    `)
  );

  const referenced = new Set<string>();
  for (const column of columns) {
    const table = String(column.tableName);
    const name = String(column.columnName);
    // 이름은 information_schema 에서 온 것이지만, 백틱을 막아 두면 더 안전하다.
    if (/[`\0]/.test(table) || /[`\0]/.test(name)) continue;
    const rows = rowsOf(
      await db.execute(
        sql.raw(
          `SELECT \`${name}\` AS v FROM \`${table}\` WHERE \`${name}\` LIKE '%/uploads/%'`
        )
      )
    );
    for (const row of rows) {
      for (const key of extractUploadKeys(
        row.v == null ? null : String(row.v)
      )) {
        referenced.add(key);
      }
    }
  }
  return withThumbnails(referenced);
}

/**
 * 원본이 쓰이면 그 옆의 작은 사진(shared/thumbnail.ts)도 쓰이는 것이다. DB 에
 * 작은 사진 주소는 따로 적지 않으므로, 이걸 빼면 매일 새벽 작은 사진을 모두
 * "안 쓰는 파일"로 보고 치운다.
 */
export function withThumbnails(keys: Set<string>) {
  const all = new Set(keys);
  keys.forEach(key => all.add(thumbnailPathFor(key)));
  return all;
}

function seoulDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
}

/** 휴지통에서 보관 기간이 지난 날짜 폴더를 완전히 지운다. */
function purgeOldTrash(root: string, now: number) {
  const trashRoot = path.join(root, TRASH_DIR_NAME);
  if (!fs.existsSync(trashRoot)) return 0;
  let purged = 0;
  for (const entry of fs.readdirSync(trashRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{8}$/.test(entry.name)) continue;
    const full = path.join(trashRoot, entry.name);
    if (now - fs.statSync(full).mtimeMs >= TRASH_RETENTION_MS) {
      fs.rmSync(full, { recursive: true, force: true });
      purged += 1;
    }
  }
  return purged;
}

export async function runUploadCleanup({
  mode = uploadCleanupMode(),
  root = UPLOAD_DIR,
  now = new Date(),
  referenced: givenReferenced,
}: {
  mode?: UploadCleanupMode;
  root?: string;
  now?: Date;
  /** 시험용. 주지 않으면 DB 에서 읽는다. */
  referenced?: Set<string>;
} = {}) {
  if (mode === "off") return { mode, moved: 0, planned: 0, skipped: true };

  const referenced = givenReferenced ?? (await collectReferencedUploadKeys());
  const files = listStoredFiles(root);
  const plan = planUploadCleanup({ files, referenced, now: now.getTime() });

  if (!plan.ok) {
    console.warn(`[UploadCleanup] 멈춤: ${plan.reason}`);
    return { mode, moved: 0, planned: plan.toTrash.length, skipped: true };
  }

  if (mode === "dry-run") {
    if (plan.toTrash.length > 0) {
      console.log(
        `[UploadCleanup] (확인만) 치울 파일 ${plan.toTrash.length}개: ${plan.toTrash.join(", ")}`
      );
    }
    return { mode, moved: 0, planned: plan.toTrash.length, skipped: false };
  }

  const dayDir = path.join(root, TRASH_DIR_NAME, seoulDateKey(now));
  let moved = 0;
  for (const key of plan.toTrash) {
    const from = path.join(root, key);
    const to = path.join(dayDir, key);
    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
      moved += 1;
    } catch (error) {
      console.error(`[UploadCleanup] 옮기지 못함: ${key}`, error);
    }
  }
  const purged = purgeOldTrash(root, now.getTime());
  console.log(
    `[UploadCleanup] 안 쓰는 파일 ${moved}개를 휴지통으로 옮김, 오래된 휴지통 ${purged}개 비움`
  );
  return { mode, moved, planned: plan.toTrash.length, skipped: false };
}

/**
 * 추모관을 지울 때처럼 "방금 쓰지 않게 된 파일"을 바로 휴지통으로 옮긴다.
 * 새벽 정리를 기다리면 그사이 주소로 계속 열리기 때문이다. 넘겨받은 목록은
 * 이미 DB 에서 더 이상 쓰이지 않는 것으로 확인된 것이어야 한다.
 */
export function moveUploadsToTrash(
  keys: string[],
  { root = UPLOAD_DIR, now = new Date() }: { root?: string; now?: Date } = {}
) {
  const dayDir = path.join(root, TRASH_DIR_NAME, seoulDateKey(now));
  const rootResolved = path.resolve(root);
  let moved = 0;
  for (const key of keys) {
    const from = path.resolve(root, key);
    // 휴지통 안이나 업로드 폴더 밖을 가리키는 값은 건드리지 않는다.
    if (
      !from.startsWith(rootResolved + path.sep) ||
      key.startsWith(".") ||
      key.includes("/.")
    ) {
      continue;
    }
    if (!fs.existsSync(from)) continue;
    const to = path.join(dayDir, key);
    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
      moved += 1;
    } catch (error) {
      console.error(`[UploadCleanup] 옮기지 못함: ${key}`, error);
    }
  }
  return moved;
}

const HOUR_MS = 60 * 60 * 1000;
let lastRunKey = "";

/** 서울 시각 새벽 3시대에 하루 한 번 돈다 (백업은 4시 37분). */
export function startUploadCleanupScheduler() {
  const tick = () => {
    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        hour12: false,
      }).format(now)
    );
    const runKey = seoulDateKey(now);
    if (hour !== 3 || lastRunKey === runKey) return;
    lastRunKey = runKey;
    // 보관 기한이 지난 제작 문의를 지운다 (개인정보처리방침 12항). 사진 정리
    // 설정과 관계없이 늘 돈다.
    purgeExpiredKioskInquiries()
      .then(count => {
        if (count > 0)
          console.log(`[Retention] 기한 지난 제작 문의 ${count}건 삭제`);
      })
      .catch(error => {
        console.error("[Retention] 제작 문의 정리 실패:", error);
      });
    // 하루 지난 추도일 알림 인증 기록도 지운다 (번호 해시만 남아 있지만 오래 둘 이유가 없다).
    purgeOldReminderPhoneVerifications().catch(error => {
      console.error("[Retention] 알림 인증 기록 정리 실패:", error);
    });
    // 관리자가 취소한 지 30일 지난 추도일 알림 신청(전화번호)을 지운다.
    purgeCancelledReminderSubscriptions()
      .then(count => {
        if (count > 0)
          console.log(`[Retention] 취소된 추도일 알림 신청 ${count}건 삭제`);
      })
      .catch(error => {
        console.error("[Retention] 취소된 알림 신청 정리 실패:", error);
      });
    if (uploadCleanupMode() === "off") return;
    runUploadCleanup().catch(error => {
      console.error("[UploadCleanup] 실패:", error);
    });
  };

  setInterval(tick, HOUR_MS / 4);

  // 확인 모드에서는 켜질 때 한 번 목록을 남긴다. 배포 직후 로그로 바로 확인하려고.
  if (uploadCleanupMode() === "dry-run") {
    setTimeout(() => {
      runUploadCleanup().catch(error => {
        console.error("[UploadCleanup] 실패:", error);
      });
    }, 30_000);
  }
}
