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

/** 제목의 긴 번호는 마지막 네 숫자만 가짜 기록에 남긴다. */
export function maskNumbersForFakeLog(subject: string) {
  return subject.replace(/\d[\d-]*\d/g, value => {
    const digits = value.replace(/-/g, "");
    return digits.length >= 6
      ? `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`
      : value;
  });
}

const DEFAULT_FAKE_DB_HOSTS = new Set([
  "db",
  "mysql",
  "mariadb",
  "somang-db",
  "workshop-db",
]);

function isPrivateIpv4(host: string) {
  const parts = host.split(".");
  if (
    parts.length !== 4 ||
    parts.some(part => !/^\d+$/.test(part) || Number(part) > 255)
  )
    return false;
  const [first, second] = parts.map(Number);
  return (
    first === 127 ||
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

/**
 * 가짜 자료를 넣어도 되는 DB 인지 본다. 하나라도 걸리면 넣지 않는다.
 * - SOMANG_FAKE=1 이어야 한다 (작업장 표식)
 * - NODE_ENV=production 이면 안 된다
 * - DB 주소가 이 컴퓨터·사설 IPv4·명시한 작업장 이름이어야 한다.
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
  let suppliedHost: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const authority = raw.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1] ?? "";
    const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
    suppliedHost = hostPort.startsWith("[")
      ? hostPort.slice(1, hostPort.indexOf("]"))
      : hostPort.split(":")[0];
  } catch {
    return { ok: false, reason: "DATABASE_URL 을 읽을 수 없습니다." };
  }
  if (!host) return { ok: false, reason: "DB 주소가 비어 있습니다." };

  const customHosts = (env.SOMANG_FAKE_DB_HOSTS ?? "")
    .split(",")
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);
  const allowed =
    suppliedHost.toLowerCase() === host &&
    (host === "localhost" ||
      host === "::1" ||
      isPrivateIpv4(host) ||
      DEFAULT_FAKE_DB_HOSTS.has(host) ||
      customHosts.includes(host));
  if (!allowed) {
    return {
      ok: false,
      reason: `DB 주소(${host})가 작업장 주소로 보이지 않습니다. 운영일 수 있어 멈춥니다.`,
    };
  }
  return { ok: true, host };
}
