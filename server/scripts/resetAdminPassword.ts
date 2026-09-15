import "dotenv/config";
import { ADMIN_LOGIN_ID, createAdminAuditLog, resetAdminPassword } from "../db";

// 관리자(아이디 admin) 비밀번호를 잊었을 때 서버 터미널에서 새로 정한다.
// 관리자 계정은 진짜 메일 주소가 없어 "비밀번호 찾기"로는 되돌릴 수 없다.
// 실행: cd /var/www/somang-memorial/current && node_modules/.bin/tsx server/scripts/resetAdminPassword.ts
// 비밀번호는 화면에 보이지 않게 입력받고, 어디에도 기록하지 않는다 (2026-09-15).

function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "관리자 비밀번호 재설정은 서버 터미널에서 직접 실행해야 합니다 (ssh -t)."
    );
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    };

    const onData = (chunk: string) => {
      if (chunk === "") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        reject(new Error("관리자 비밀번호 재설정을 취소했습니다."));
        return;
      }

      if (chunk === "\r" || chunk === "\n") {
        finish();
        return;
      }

      if (chunk === "" || chunk === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += chunk;
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  const password = await readHidden(
    `관리자 아이디 ${ADMIN_LOGIN_ID}의 새 비밀번호 (12자 이상): `
  );
  const confirmation = await readHidden("비밀번호 다시 입력: ");

  if (password.length < 12) {
    throw new Error("관리자 비밀번호는 12자 이상으로 설정해주세요.");
  }

  if (password !== confirmation) {
    throw new Error("두 비밀번호가 일치하지 않습니다.");
  }

  const admin = await resetAdminPassword(password);

  await createAdminAuditLog({
    adminUserId: null,
    targetUserId: admin.id,
    action: "admin.password.reset",
    note: "서버 터미널에서 관리자 비밀번호를 새로 정함",
  });

  process.stdout.write(
    `관리자 '${ADMIN_LOGIN_ID}' 비밀번호를 새로 정했습니다. 기존 관리자 로그인은 모두 풀립니다.\n`
  );
  process.exit(0);
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "관리자 비밀번호 재설정에 실패했습니다."}\n`
  );
  process.exit(1);
});
