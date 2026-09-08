import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const wrapper = fileURLToPath(new URL("./ops-pm2-restart.sh", import.meta.url));
const windowsBash = path.join(process.env.ProgramFiles || "C:/Program Files", "Git/bin/bash.exe");
const bash = process.platform === "win32" && existsSync(windowsBash) ? windowsBash : "bash";
const argumentError = "Only somang-memorial may be restarted, with no extra arguments.\n";

function shell(args, environment = {}) {
  const result = spawnSync(bash, ["-p", ...args], {
    encoding: "utf8",
    timeout: 5000,
    env: { ...process.env, ...environment },
  });
  if (result.error) throw result.error;
  return result;
}

// Intercept the fixed OS calls and final exec. These tests never contact PM2
// or change a real user, service, directory or process.
const harness = `
function /usr/bin/python3 {
  [ "$*" = '-I /usr/local/lib/dadowoom-storage/upload-mount-guard.py somang-memorial' ] || return 93
  [ "\${TEST_MOUNT_MISSING:-0}" != 1 ] || return 1
}
function /usr/bin/id {
  case "$*" in
    '-u') printf '%s\\n' "\${TEST_MANAGER_UID:-0}" ;;
    '-u somangapp')
      [ "\${TEST_ACCOUNT_MISSING:-0}" != 1 ] || return 1
      printf '%s\\n' "\${TEST_APP_UID:-1007}" ;;
    '-g somangapp') printf '%s\\n' "\${TEST_APP_GID:-1007}" ;;
    '-gn somangapp') printf '%s\\n' "\${TEST_APP_GROUP:-somangapp}" ;;
    *) return 91 ;;
  esac
}
cd() {
  [ "$#" = 1 ] && [ "$1" = /root ] || return 92
  [ "\${TEST_ROOT_DIRECTORY_FAILURE:-0}" != 1 ] || return 73
}
exec() { printf '%s\\n' "$@"; }
source "$1" somang-memorial
`;

function simulate(environment = {}) {
  return shell(["-c", harness, "somang-restart-boundary", wrapper], environment);
}

describe("fixed Somang PM2 restart boundary", () => {
  it("blocks PM2 restart when the additional-disk mount is absent", () => {
    const result = simulate({ TEST_MOUNT_MISSING: '1' });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
  });
  it.each([
    [], [""], ["all"], ["joych-homepage"], ["3050"],
    ["somang-memorial", "--uid", "root"], ["somang-memorial", ""],
    ["somang-memorial; id"],
  ])("rejects unsupported arguments %j", (...args) => {
    const result = shell([wrapper, ...args]);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(argumentError);
  });

  it("does not load a caller's BASH_ENV", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "somang-restart-test-"));
    try {
      const injection = path.join(directory, "injection.sh");
      writeFileSync(injection, "printf 'UNSAFE_BASH_ENV_LOADED' >&2\nexit 89\n");
      const result = shell([wrapper, "all"], { BASH_ENV: injection });
      expect(result.status).toBe(2);
      expect(result.stderr).toBe(argumentError);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("forces the dedicated identity and fixed app despite hostile environment", () => {
    const result = simulate({
      NODE_OPTIONS: "--require /untrusted/entry.js", NODE_PATH: "/untrusted/modules",
      PM2_NODE_OPTIONS: "--require /untrusted/other.js", PM2_HOME: "/untrusted/pm2",
      HOME: "/untrusted/home", PORT: "3000", UPLOAD_DIR: "/untrusted/uploads",
      TEST_APP_UID: "1009", TEST_APP_GID: "1010",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trimEnd().split("\n")).toEqual([
      "/usr/bin/env", "-i", "HOME=/var/lib/somangapp", "PATH=/usr/bin:/bin",
      "PM2_HOME=/root/.pm2", "NODE_ENV=production", "PORT=3050",
      "UPLOAD_DIR=/var/www/somang-memorial/uploads",
      "/usr/bin/node", "/usr/lib/node_modules/pm2/bin/pm2",
      "restart", "somang-memorial", "--uid", "1009", "--gid", "1010",
      "--update-env", "--silent",
    ]);
  });

  it.each([
    { TEST_MANAGER_UID: "1007" }, { TEST_ACCOUNT_MISSING: "1" },
    { TEST_APP_UID: "0" }, { TEST_APP_GID: "0" },
    { TEST_APP_UID: "invalid" }, { TEST_APP_GID: "-1" },
    { TEST_APP_GROUP: "root" },
  ])("blocks restart if identity checks fail: %j", environment => {
    const result = simulate(environment);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
  });

  it("does not restart when the trusted working directory is unavailable", () => {
    const result = simulate({ TEST_ROOT_DIRECTORY_FAILURE: "1" });
    expect(result.status).toBe(73);
    expect(result.stdout).toBe("");
  });

  it("enables privileged Bash mode when installed directly", () => {
    expect(readFileSync(wrapper, "utf8").startsWith("#!/bin/bash -p\n")).toBe(true);
  });
});
