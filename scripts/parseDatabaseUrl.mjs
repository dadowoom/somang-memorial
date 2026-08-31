/**
 * DATABASE_URL 을 셸이 그대로 쓸 수 있는 변수 대입문으로 바꿔 출력한다.
 *
 * scripts/backup.sh 가 사용한다. 비밀번호에 특수문자(@ : / # 등)가 들어 있어도
 * 정확히 분해되고, 값은 작은따옴표로 감싸서 셸이 다시 해석하지 않게 한다.
 *
 *   $ DATABASE_URL='mysql://u:p@h:3306/somang' node scripts/parseDatabaseUrl.mjs
 *   DB_HOST='h'
 *   DB_PORT='3306'
 *   DB_USER='u'
 *   DB_PASS='p'
 *   DB_NAME='somang'
 */

import { pathToFileURL } from "node:url";

export function parseDatabaseUrl(value) {
  if (!value) {
    throw new Error("DATABASE_URL 이 비어 있습니다.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL 형식을 읽을 수 없습니다.");
  }

  if (!url.protocol.startsWith("mysql")) {
    throw new Error("DATABASE_URL 이 mysql:// 형식이 아닙니다.");
  }

  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name) {
    throw new Error("DATABASE_URL 에 데이터베이스 이름이 없습니다.");
  }
  if (!url.hostname) {
    throw new Error("DATABASE_URL 에 서버 주소가 없습니다.");
  }

  return {
    host: url.hostname,
    port: url.port || "3306",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: name,
  };
}

/**
 * 작은따옴표로 감싼다. 값 안의 작은따옴표는 따옴표를 닫고 이스케이프한 뒤 다시 여는
 * 방식('\'')으로 처리한다 — 셸에서 안전하게 값을 넘기는 표준 방법이다.
 */
export function toShellSingleQuoted(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function toShellAssignments(parsed) {
  return [
    ["DB_HOST", parsed.host],
    ["DB_PORT", parsed.port],
    ["DB_USER", parsed.user],
    ["DB_PASS", parsed.password],
    ["DB_NAME", parsed.database],
  ]
    .map(([key, value]) => `${key}=${toShellSingleQuoted(value)}`)
    .join("\n");
}

// 이 파일을 직접 실행했는지 확인한다. 경로를 문자열로 이어 붙이면 윈도우에서
// 형식이 달라 항상 거짓이 되므로, 표준 변환 함수로 비교한다.
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    console.log(toShellAssignments(parseDatabaseUrl(process.env.DATABASE_URL)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
