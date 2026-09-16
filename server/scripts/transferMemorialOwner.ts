import "dotenv/config";
import { createInterface } from "readline";
import {
  createAdminAuditLog,
  getAdminMemorialBySlug,
  getUserByEmail,
  transferMemorialOwner,
} from "../db";

// 추모관의 주인(만든 회원)을 다른 회원으로 옮긴다 (2026-09-16).
// 관리자 화면에는 아직 이 기능이 없어 서버 터미널에서 실행한다.
// 실행: cd /var/www/somang-memorial/current && node_modules/.bin/tsx server/scripts/transferMemorialOwner.ts <추모관주소이름> <새주인이메일>
// 예:   … transferMemorialOwner.ts kim-somang-kwonsa somang@example.org
// 바꾸기 전에 현재 주인과 새 주인을 보여 주고 "y" 를 받아야만 실행한다. 감사기록에 남는다.

function ask(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const [slug, email] = process.argv.slice(2);
  if (!slug || !email) {
    throw new Error(
      "사용법: transferMemorialOwner.ts <추모관주소이름> <새주인이메일>"
    );
  }

  const memorial = await getAdminMemorialBySlug(slug);
  if (!memorial) {
    throw new Error(`추모관을 찾을 수 없습니다: ${slug}`);
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`회원을 찾을 수 없습니다: ${email}`);
  }
  if (user.approvalStatus !== "approved") {
    throw new Error(
      `이 회원은 승인된 상태가 아닙니다 (${user.approvalStatus}). 먼저 승인해 주세요.`
    );
  }
  if (memorial.createdByUserId === user.id) {
    process.stdout.write("이미 이 회원이 주인입니다. 바꿀 것이 없습니다.\n");
    process.exit(0);
  }

  process.stdout.write(
    `추모관: ${memorial.name} (${memorial.slug})\n` +
      `현재 주인: 회원번호 ${memorial.createdByUserId ?? "없음"}\n` +
      `새 주인:   회원번호 ${user.id} · ${user.email}\n`
  );
  const answer = await ask("이대로 옮길까요? (y/N): ");
  if (answer.toLowerCase() !== "y") {
    process.stdout.write("취소했습니다. 아무것도 바꾸지 않았습니다.\n");
    process.exit(0);
  }

  const result = await transferMemorialOwner({
    memorialId: memorial.id,
    toUserId: user.id,
  });

  await createAdminAuditLog({
    adminUserId: null,
    targetUserId: user.id,
    action: "memorial.owner.transfer",
    beforeValue: String(result.fromUserId ?? ""),
    afterValue: String(user.id),
    note: `${memorial.name} (${memorial.slug}) · 서버 터미널에서 주인 변경`,
  });

  process.stdout.write(
    `옮겼습니다. 이제 ${user.email} 의 "내 추모관"에 ${memorial.name} 추모관이 보입니다.\n`
  );
  process.exit(0);
}

main().catch(error => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "추모관 주인 변경에 실패했습니다."}\n`
  );
  process.exit(1);
});
