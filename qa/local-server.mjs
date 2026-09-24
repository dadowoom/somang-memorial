#!/usr/bin/env node
/**
 * 이 PC 시험 서버(가짜 자료) 켜고 끄기.
 *
 *   node qa/local-server.mjs start [--build]   시험 DB(127.0.0.1:3308)·앱(5190)을 켠다. --build 면 운영 빌드부터
 *   node qa/local-server.mjs status            켜져 있는지
 *   node qa/local-server.mjs restart-app       앱만 다시 켠다(메모리의 횟수 제한이 풀린다)
 *   node qa/local-server.mjs stop              끈다
 *   node qa/local-server.mjs reset --yes       끄고 .qa-local 안의 DB·올린 사진·결과를 모두 지운다
 *
 * - MySQL 8 mysqld 가 필요하다. 못 찾으면 QA_MYSQLD 에 mysqld 위치를 넣는다. Windows 서비스로 등록하지 않는다.
 * - 모든 자료는 저장소의 .qa-local/ 에만 생긴다(git 무시). 운영 서버·운영 DB 에는 연결하지 않는다.
 * - 앱은 알림톡·메일·예약 발송을 모두 끈 채로 뜬다(qa/lib/env.mjs 의 appEnv).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
  APP_PORT,
  BASE,
  DB_NAME,
  DB_PORT,
  LOCAL,
  REPO,
  appEnv,
  ensureDir,
  requireFromRepo,
} from "./lib/env.mjs";

const DATA = path.join(LOCAL, "mysql");
const PIDS = path.join(LOCAL, "pids.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findMysqld() {
  const candidates = [
    process.env.QA_MYSQLD,
    "C:/Users/LEE/tools/mysql-8.0.45-winx64/bin/mysqld.exe",
    "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe",
    "/usr/sbin/mysqld",
    "/opt/homebrew/opt/mysql@8.0/bin/mysqld",
    "/usr/local/opt/mysql@8.0/bin/mysqld",
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    throw new Error("mysqld 를 찾지 못했습니다. QA_MYSQLD 에 위치를 넣어 주세요.");
  }
  return found;
}

function readPids() {
  try {
    return JSON.parse(fs.readFileSync(PIDS, "utf8"));
  } catch {
    return {};
  }
}
function writePids(pids) {
  fs.writeFileSync(PIDS, JSON.stringify(pids, null, 2));
}
function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function dbConnect(database) {
  const mysql = requireFromRepo("mysql2/promise");
  return mysql.createConnection({
    host: "127.0.0.1",
    port: DB_PORT,
    user: "root",
    database,
    multipleStatements: false,
  });
}

async function dbUp() {
  try {
    const conn = await dbConnect();
    await conn.query("SELECT 1");
    await conn.end();
    return true;
  } catch {
    return false;
  }
}

async function appUp() {
  try {
    const res = await fetch(`${BASE}/readyz`);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function startDb() {
  if (await dbUp()) {
    console.log(`- 시험 DB 이미 켜져 있음 (127.0.0.1:${DB_PORT})`);
    return;
  }
  const mysqld = findMysqld();
  const basedir = path.resolve(path.dirname(mysqld), "..");
  if (!fs.existsSync(path.join(DATA, "mysql"))) {
    ensureDir(DATA);
    console.log("- 시험 DB 새로 만들기 (처음 한 번)");
    const init = spawnSync(
      mysqld,
      [
        "--no-defaults",
        "--initialize-insecure",
        `--basedir=${basedir}`,
        `--datadir=${DATA}`,
      ],
      { stdio: "inherit" }
    );
    if (init.status !== 0) throw new Error("mysqld 초기화 실패");
  }
  const log = fs.openSync(path.join(LOCAL, "mysqld.log"), "a");
  const child = spawn(
    mysqld,
    [
      "--no-defaults",
      `--basedir=${basedir}`,
      `--datadir=${DATA}`,
      `--port=${DB_PORT}`,
      "--bind-address=127.0.0.1",
      "--mysqlx=OFF",
      "--console",
    ],
    { detached: true, stdio: ["ignore", log, log], windowsHide: true }
  );
  child.unref();
  writePids({ ...readPids(), mysqld: child.pid });
  for (let i = 0; i < 60; i += 1) {
    if (await dbUp()) break;
    await sleep(1000);
  }
  if (!(await dbUp())) throw new Error("시험 DB 가 뜨지 않습니다. .qa-local/mysqld.log 를 보세요.");
  console.log(`- 시험 DB 켜짐 (127.0.0.1:${DB_PORT})`);
}

async function migrate() {
  const conn = await dbConnect();
  await conn.query(
    // 문자 정렬 규칙(collation)은 운영처럼 MySQL 기본값을 쓴다. 대소문자 구분 여부가 결과를 바꾼다.
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``
  );
  await conn.end();
  const bin = path.join(path.dirname(requireFromRepo.resolve("drizzle-kit")), "bin.cjs");
  const run = spawnSync(process.execPath, [bin, "migrate"], {
    cwd: REPO,
    env: appEnv(),
    encoding: "utf8",
  });
  if (run.status !== 0) {
    console.error(run.stdout, run.stderr);
    throw new Error("표 만들기(drizzle-kit migrate) 실패");
  }
  console.log("- 표 만들기(마이그레이션) 끝");
}

async function startApp({ build }) {
  if (await appUp()) {
    console.log(`- 앱 이미 켜져 있음 (${BASE})`);
    return;
  }
  if (build || !fs.existsSync(path.join(REPO, "dist", "index.js"))) {
    console.log("- 운영 빌드 (pnpm run build)");
    const b = spawnSync("pnpm", ["run", "build"], {
      cwd: REPO,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (b.status !== 0) throw new Error("빌드 실패");
  }
  ensureDir(path.join(LOCAL, "uploads"));
  const log = fs.openSync(path.join(LOCAL, "app.log"), "a");
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: REPO,
    env: appEnv(),
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
  });
  child.unref();
  writePids({ ...readPids(), app: child.pid });
  for (let i = 0; i < 40; i += 1) {
    if (await appUp()) break;
    await sleep(500);
  }
  if (!(await appUp())) throw new Error("앱이 뜨지 않습니다. .qa-local/app.log 를 보세요.");
  console.log(`- 앱 켜짐 ${BASE}`);
}

async function stopApp() {
  const pids = readPids();
  if (alive(pids.app)) {
    process.kill(pids.app);
    for (let i = 0; i < 20 && (await appUp()); i += 1) await sleep(250);
    console.log("- 앱 끔");
  }
}

async function stop() {
  const pids = readPids();
  await stopApp();
  if (await dbUp()) {
    const admin = path.join(path.dirname(findMysqld()), process.platform === "win32" ? "mysqladmin.exe" : "mysqladmin");
    const r = spawnSync(admin, ["-uroot", "-h127.0.0.1", `-P${DB_PORT}`, "shutdown"], {
      stdio: "inherit",
    });
    if (r.status !== 0 && alive(pids.mysqld)) process.kill(pids.mysqld);
    for (let i = 0; i < 30 && (await dbUp()); i += 1) await sleep(500);
    console.log("- 시험 DB 끔");
  }
  writePids({});
}

const [cmd, ...args] = process.argv.slice(2);
ensureDir(LOCAL);
try {
  if (cmd === "start") {
    await startDb();
    await migrate();
    await startApp({ build: args.includes("--build") });
    console.log("다음: node qa/seed.mjs");
  } else if (cmd === "restart-app") {
    // 앱 안의 횟수 제한(편지 6통/10분 등)은 메모리에만 있어서, 다시 켜면 풀린다.
    await stopApp();
    await startApp({ build: args.includes("--build") });
  } else if (cmd === "stop") {
    await stop();
  } else if (cmd === "status") {
    console.log(`시험 DB ${(await dbUp()) ? "켜짐" : "꺼짐"} (127.0.0.1:${DB_PORT}) / 앱 ${(await appUp()) ? "켜짐" : "꺼짐"} (${BASE})`);
  } else if (cmd === "reset") {
    if (!args.includes("--yes")) throw new Error("정말 지우려면 --yes 를 붙이세요.");
    await stop();
    for (const name of ["mysql", "uploads", "results", "fixtures.json", "jwt-secret.txt"]) {
      // 막 끈 mysqld 가 파일을 잠시 쥐고 있을 수 있어 몇 번 다시 해 본다.
      fs.rmSync(path.join(LOCAL, name), { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
    }
    console.log("- .qa-local 의 시험 자료를 지웠습니다.");
  } else {
    console.log("사용법: node qa/local-server.mjs start [--build] | status | restart-app | stop | reset --yes");
    process.exit(2);
  }
} catch (error) {
  console.error(`멈춤: ${error.message}`);
  process.exit(1);
}

