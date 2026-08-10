import {
  ADMIN_LOGIN_ID,
  createBootstrapAdmin,
  hasAdminUser,
} from "../db";

function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("관리자 비밀번호 설정은 서버 터미널에서 직접 실행해야 합니다.");
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
      if (chunk === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        reject(new Error("관리자 비밀번호 설정을 취소했습니다."));
        return;
      }

      if (chunk === "\r" || chunk === "\n") {
        finish();
        return;
      }

      if (chunk === "\u007f" || chunk === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += chunk;
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  if (await hasAdminUser()) {
    throw new Error("이미 관리자 계정이 있어 새로 만들 수 없습니다.");
  }

  const password = await readHidden(`관리자 아이디 ${ADMIN_LOGIN_ID}의 새 비밀번호: `);
  const confirmation = await readHidden("비밀번호 다시 입력: ");

  if (password.length < 12) {
    throw new Error("관리자 비밀번호는 12자 이상으로 설정해주세요.");
  }

  if (password !== confirmation) {
    throw new Error("두 비밀번호가 일치하지 않습니다.");
  }

  await createBootstrapAdmin(password);
  process.stdout.write(`관리자 계정 '${ADMIN_LOGIN_ID}'을 만들었습니다.\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : "관리자 계정 생성에 실패했습니다."}\n`);
  process.exitCode = 1;
});
