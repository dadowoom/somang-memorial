// 검수 도구가 같이 쓰는 설정. 값은 모두 이 PC 시험용이고 비밀값이 아니다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
export const LOCAL = path.join(REPO, ".qa-local");
export const DB_PORT = Number(process.env.QA_DB_PORT || 3308);
export const APP_PORT = Number(process.env.QA_APP_PORT || 5190);
export const DB_NAME = "somang_qa";
export const BASE = `http://127.0.0.1:${APP_PORT}`;
export const DATABASE_URL = `mysql://root@127.0.0.1:${DB_PORT}/${DB_NAME}`;

// 운영 DB 로 새지 않게 막는 잠금. 시험 도구는 이 PC 의 127.0.0.1 만 쓴다.
if (![DB_PORT, APP_PORT].every(p => Number.isInteger(p) && p > 1024)) {
  throw new Error("QA_DB_PORT / QA_APP_PORT 가 올바르지 않습니다.");
}
if ([3307, 43307].includes(DB_PORT)) {
  throw new Error(
    `포트 ${DB_PORT} 는 다른 검수가 쓰는 포트입니다. QA_DB_PORT 를 바꾸세요.`
  );
}

export const requireFromRepo = createRequire(path.join(REPO, "package.json"));

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** 시험 서버 세션 서명 열쇠. 매번 새로 만들어 .qa-local 에만 둔다. */
export function localSecret() {
  const file = path.join(ensureDir(LOCAL), "jwt-secret.txt");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"));
  }
  return fs.readFileSync(file, "utf8").trim();
}

/**
 * 앱에 넘기는 환경값. 알림톡·메일·외부 저장소 값은 모두 빈 문자열로 덮는다.
 * (dotenv 는 이미 있는 키를 덮지 않으므로, 저장소에 .env 가 있어도 발송 설정이 새지 않는다.)
 */
export function appEnv() {
  const blank = [
    "ALIGO_API_KEY",
    "ALIGO_USER_ID",
    "ALIGO_SENDER_KEY",
    "ALIGO_SENDER",
    "ALIGO_TPL_REMINDER_CONFIRM",
    "ALIGO_TPL_REMINDER_DAY_BEFORE",
    "ALIGO_TPL_VERIFY_CODE",
    "ALIGO_TPL_LETTER_NOTICE",
    "ALIGO_TEST_MODE",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "INQUIRY_NOTIFY_EMAIL",
    "OAUTH_SERVER_URL",
    "VITE_APP_ID",
    "OWNER_OPEN_ID",
    "BUILT_IN_FORGE_API_URL",
    "BUILT_IN_FORGE_API_KEY",
    "KIM_SOMANG_FAMILY_VIDEO_ID",
  ];
  const env = { ...process.env };
  for (const key of blank) env[key] = "";
  return {
    ...env,
    NODE_ENV: "production",
    PORT: String(APP_PORT),
    DATABASE_URL,
    JWT_SECRET: localSecret(),
    UPLOAD_DIR: path.join(LOCAL, "uploads"),
    UPLOAD_CLEANUP_MODE: "off",
    PUBLIC_SITE_URL: BASE,
    TRUST_PROXY: "false",
    REMINDER_SCHEDULER_ENABLED: "false",
    LETTER_NOTICE_ENABLED: "false",
  };
}

/** 가짜 계정. 이름·메일·번호 모두 시험용이다. */
export const ACCOUNTS = {
  admin: {
    login: "admin",
    email: "admin@somang-memorial.invalid",
    name: "시험관리자",
    password: "QaAdmin-0001!",
    role: "admin",
  },
  owner: {
    login: "qa-owner@example.com",
    email: "qa-owner@example.com",
    name: "시험가족일",
    phone: "010-0000-0001",
    password: "QaOwner-0001!",
  },
  member: {
    login: "qa-member@example.com",
    email: "qa-member@example.com",
    name: "시험가족이",
    phone: "010-0000-0002",
    password: "QaMember-0001!",
  },
  other: {
    login: "qa-other@example.com",
    email: "qa-other@example.com",
    name: "시험남남",
    phone: "010-0000-0003",
    password: "QaOther-0001!",
  },
  flow: {
    login: "qa-flow@example.com",
    email: "qa-flow@example.com",
    name: "시험흐름",
    phone: "010-0000-0004",
    password: "QaFlow-0001!",
  },
};

/** 시드가 만든 대상(주소·번호)을 적어 두는 파일. */
export const FIXTURE_FILE = path.join(LOCAL, "fixtures.json");
export function readFixtures() {
  if (!fs.existsSync(FIXTURE_FILE)) {
    throw new Error("시험 자료가 없습니다. 먼저 node qa/seed.mjs 를 돌리세요.");
  }
  return JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8"));
}

export function resultDir(kind) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-");
  return ensureDir(path.join(LOCAL, "results", `${stamp}-${kind}`));
}

/** playwright 를 찾는다. 저장소에 없으면 QA_PLAYWRIGHT 에 설치된 폴더를 넣는다. */
export function loadPlaywright() {
  const tries = [];
  if (process.env.QA_PLAYWRIGHT) {
    tries.push(createRequire(path.join(process.env.QA_PLAYWRIGHT, "x.js")));
  }
  tries.push(requireFromRepo);
  for (const req of tries) {
    for (const name of ["playwright", "playwright-core", "@playwright/test"]) {
      try {
        return req(name);
      } catch {
        // 다음 후보
      }
    }
  }
  throw new Error(
    "playwright 를 찾지 못했습니다. playwright 가 설치된 폴더를 QA_PLAYWRIGHT 에 넣어 주세요 (qa/README.md)."
  );
}

export async function launchBrowser() {
  const pw = loadPlaywright();
  const chromium = pw.chromium;
  const channel = process.env.QA_BROWSER_CHANNEL; // 예: msedge, chrome
  try {
    return await chromium.launch(channel ? { channel } : {});
  } catch (error) {
    if (channel) throw error;
    // 내려받은 크로미움이 없으면 이 PC 의 Edge 로.
    return chromium.launch({ channel: "msedge" });
  }
}
