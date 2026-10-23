/** The preview container accepts only this one isolated database and mail sink. */
export const PREVIEW_URL = "https://somang-preview.dadowoomtest.co.kr";

const allowed = new Set([
  "SOMANG_FAKE",
  "NODE_ENV",
  "HOST",
  "PORT",
  "DATABASE_URL",
  "JWT_SECRET",
  "PUBLIC_SITE_URL",
  "PUBLIC_BASE_URL",
  "APP_ORIGIN",
  "HEALTH_PATH",
  "UPLOAD_DIR",
  "STATE_DIR",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "SMTP_SECURE",
  "SMTP_REQUIRE_TLS",
  "REMINDER_SCHEDULER_ENABLED",
  "LETTER_NOTICE_ENABLED",
  "SOMANG_FAKE_ADMIN_PASSWORD",
  "SOMANG_FAKE_USER_PASSWORD",
  "SOMANG_FAKE_PRIVATE_PASSWORD",
  "SOMANG_FAKE_ROOM_PASSWORD",
  "TRUST_PROXY",
  "COOKIE_SECURE",
  "PATH",
  "HOME",
  "LANG",
  "TZ",
  "PWD",
  "TMPDIR",
  "TMP",
  "TEMP",
]);

const forbidden = (name: string) =>
  (/^(?:ALIGO_|S3_|AWS_|BUILT_IN_FORGE_|OAUTH_|OPENAI_|ANTHROPIC_|DOTENV_|PREVIEW_PEER|VITE_|REMINDER|LETTER_NOTICE|SOLAPI_|COOLSMS_)/.test(
    name
  ) &&
    !["REMINDER_SCHEDULER_ENABLED", "LETTER_NOTICE_ENABLED"].includes(name)) ||
  (name.startsWith("SMTP_") && !allowed.has(name)) ||
  [
    "INQUIRY_NOTIFY_EMAIL",
    "OWNER_OPEN_ID",
    "NODE_OPTIONS",
    "NODE_PATH",
    "YOUTUBE_API_KEY",
    "KIM_SOMANG_FAMILY_VIDEO_ID",
  ].includes(name);

export class PreviewGuardError extends Error {
  constructor(key: string) {
    super(`작업장 설정 거부: ${key}`);
  }
}

function exact(env: NodeJS.ProcessEnv, key: string, expected: string) {
  if (env[key] !== expected) throw new PreviewGuardError(key);
}

export function validatePreviewEnv(raw: NodeJS.ProcessEnv) {
  exact(raw, "SOMANG_FAKE", "1");
  for (const key of Object.keys(raw)) {
    if (forbidden(key)) throw new PreviewGuardError(key);
  }
  const clean: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowed.has(key) && value !== undefined) clean[key] = value;
    else if (!allowed.has(key)) console.warn(`[작업장] 버린 환경 이름: ${key}`);
  }
  for (const [key, value] of Object.entries({
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PORT: "3000",
    SMTP_HOST: "mail",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    SMTP_REQUIRE_TLS: "false",
    REMINDER_SCHEDULER_ENABLED: "false",
    LETTER_NOTICE_ENABLED: "false",
    UPLOAD_DIR: "/data/uploads",
    STATE_DIR: "/data/state",
  }))
    exact(clean, key, value);
  for (const key of ["PUBLIC_SITE_URL", "PUBLIC_BASE_URL", "APP_ORIGIN"]) {
    if (clean[key] !== undefined) exact(clean, key, PREVIEW_URL);
  }
  exact(clean, "PUBLIC_SITE_URL", PREVIEW_URL);
  if (clean.HEALTH_PATH !== undefined)
    exact(clean, "HEALTH_PATH", "/api/health");
  if (!["1", "true"].includes(clean.TRUST_PROXY ?? ""))
    throw new PreviewGuardError("TRUST_PROXY");
  if (!["1", "true"].includes(clean.COOKIE_SECURE ?? ""))
    throw new PreviewGuardError("COOKIE_SECURE");
  // Existing cookie/security code checks the literal string "true".
  clean.TRUST_PROXY = "true";
  if (
    (clean.JWT_SECRET ?? "").trim().length < 32 ||
    Buffer.byteLength((clean.JWT_SECRET ?? "").trim(), "utf8") < 32
  )
    throw new PreviewGuardError("JWT_SECRET");
  if (
    !clean.SMTP_FROM?.trim() ||
    !/^[^<>\r\n]*(?:<)?[a-z0-9._+-]+@preview\.invalid(?:>)?$/i.test(
      clean.SMTP_FROM.trim()
    )
  )
    throw new PreviewGuardError("SMTP_FROM");
  let url: URL;
  try {
    url = new URL(clean.DATABASE_URL ?? "");
  } catch {
    throw new PreviewGuardError("DATABASE_URL");
  }
  if (
    url.protocol !== "mysql:" ||
    url.hostname !== "db" ||
    url.port !== "3306" ||
    url.pathname !== "/somang_workshop" ||
    !url.username ||
    !url.password ||
    url.search ||
    url.hash
  )
    throw new PreviewGuardError("DATABASE_URL");
  return clean;
}

export function installPreviewEnv(clean: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, clean);
}

export function checkResetFlags(args: string[]) {
  const first = args.includes("--site-reset");
  const second = args.includes("--confirm-site-reset");
  if (
    first !== second ||
    args.some(arg => !["--site-reset", "--confirm-site-reset"].includes(arg))
  ) {
    throw new PreviewGuardError("site-reset flags");
  }
  return first && second;
}
