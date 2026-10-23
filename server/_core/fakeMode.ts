/**
 * 작업장(가짜 자료) 모드 (2026-10-23).
 *
 * 작업장은 두 공동대표만 들어가는 미리보기 서버다. 가짜 자료로 서비스가 그대로
 * 돌고, 알림톡·메일은 실제로 보내지 않고 "보낸 것으로 기록"만 남긴다.
 * SOMANG_FAKE=1 일 때만 켜진다. 운영 서버에는 이 값을 넣지 않는다.
 */
export function isFakeMode(env: NodeJS.ProcessEnv = process.env) {
  return env.SOMANG_FAKE === "1";
}

/** 번호·주소를 기록에 남길 때 끝 몇 글자만 보인다. */
export function maskForFakeLog(value: string, keep = 4) {
  const text = value.trim();
  if (text.length <= keep) return "*".repeat(text.length);
  return `${"*".repeat(Math.min(6, text.length - keep))}${text.slice(-keep)}`;
}

const PRIVATE_IPV4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];
const LOCAL_SUFFIXES = [".local", ".test", ".internal", ".localhost"];

/**
 * 가짜 자료를 넣어도 되는 DB 인지 본다. 하나라도 걸리면 넣지 않는다.
 * - SOMANG_FAKE=1 이어야 한다 (작업장 표식)
 * - NODE_ENV=production 이면 안 된다
 * - DB 주소가 이 컴퓨터·사설망·작업장 이름(점 없는 이름, .local/.test/.internal)
 *   이어야 한다. 운영 DB 처럼 바깥 도메인이면 멈춘다.
 */
export function checkFakeSeedTarget(
  env: NodeJS.ProcessEnv
): { ok: true; host: string } | { ok: false; reason: string } {
  if (env.SOMANG_FAKE !== "1") {
    return {
      ok: false,
      reason: "작업장 표식(SOMANG_FAKE=1)이 없습니다. 운영일 수 있어 멈춥니다.",
    };
  }
  if (env.NODE_ENV === "production") {
    return {
      ok: false,
      reason: "NODE_ENV=production 입니다. 운영일 수 있어 멈춥니다.",
    };
  }
  const raw = env.DATABASE_URL ?? "";
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return { ok: false, reason: "DATABASE_URL 을 읽을 수 없습니다." };
  }
  if (!host) return { ok: false, reason: "DB 주소가 비어 있습니다." };

  const allowed =
    host === "localhost" ||
    host === "::1" ||
    PRIVATE_IPV4.some(pattern => pattern.test(host)) ||
    // 컨테이너 이름처럼 점이 없는 이름 (예: mysql, somang-db)
    /^[a-z0-9][a-z0-9-]*$/.test(host) ||
    LOCAL_SUFFIXES.some(suffix => host.endsWith(suffix));
  if (!allowed) {
    return {
      ok: false,
      reason: `DB 주소(${host})가 작업장 주소로 보이지 않습니다. 운영일 수 있어 멈춥니다.`,
    };
  }
  return { ok: true, host };
}
