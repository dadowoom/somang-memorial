import "dotenv/config";
import { randomBytes } from "crypto";
import { checkFakeSeedTarget } from "../_core/fakeMode";
import { FAKE_EMAIL_DOMAIN, runFakeSeed } from "../fakeSeed";
import { countNonFakeUsers, createDbFakeSeedStore } from "../fakeSeedStore";

/**
 * 작업장에 가짜 자료를 넣는다 (2026-10-23).
 *
 *   SOMANG_FAKE=1 DATABASE_URL=mysql://...@작업장DB/... pnpm run seed:fake
 *
 * - SOMANG_FAKE=1 이 없거나, NODE_ENV=production 이거나, DB 주소가 바깥(운영처럼
 *   보이는) 주소면 아무것도 하지 않고 멈춘다.
 * - 가짜가 아닌 회원이 하나라도 있는 DB(운영 자료 사본 등)에도 넣지 않는다.
 * - 두 번 돌려도 같은 것을 또 넣지 않는다.
 * - 비밀번호는 SOMANG_FAKE_ADMIN_PASSWORD 등으로 줄 수 있고, 없으면 무작위로
 *   만들어 이번에 새로 만든 것만 한 번 보여 준다(저장소에는 남기지 않는다).
 */
function passwordFrom(name: string) {
  return process.env[name]?.trim() || randomBytes(9).toString("base64url");
}

async function main() {
  const target = checkFakeSeedTarget(process.env);
  if (!target.ok) {
    console.error(`[가짜 자료] 멈춤: ${target.reason}`);
    process.exit(2);
  }

  const realUsers = await countNonFakeUsers(FAKE_EMAIL_DOMAIN);
  if (realUsers > 0) {
    console.error(
      `[가짜 자료] 멈춤: 가짜가 아닌 회원이 ${realUsers}명 있습니다. 운영 자료일 수 있어 넣지 않습니다.`
    );
    process.exit(2);
  }

  const passwords = {
    admin: passwordFrom("SOMANG_FAKE_ADMIN_PASSWORD"),
    user: passwordFrom("SOMANG_FAKE_USER_PASSWORD"),
    privateMemorial: passwordFrom("SOMANG_FAKE_PRIVATE_PASSWORD"),
    familyRoom: passwordFrom("SOMANG_FAKE_ROOM_PASSWORD"),
  };
  const store = await createDbFakeSeedStore();
  const made = await runFakeSeed(store, passwords);

  console.log(
    `[가짜 자료] DB ${target.host} 에 넣었습니다:`,
    JSON.stringify(made)
  );
  if (made.admin)
    console.log(`  관리자 아이디 admin / 비밀번호 ${passwords.admin}`);
  if (made.users)
    console.log(
      `  가짜 가족 family1~3@${FAKE_EMAIL_DOMAIN} / 비밀번호 ${passwords.user}`
    );
  if (made.memorials)
    console.log(
      `  비공개 추모관(fake-jung-eunhye) 입장 비밀번호 ${passwords.privateMemorial}`
    );
  if (made.familyRooms)
    console.log(`  가족관(fake-kim-somang) 비밀번호 ${passwords.familyRoom}`);
  process.exit(0);
}

main().catch(error => {
  console.error(
    "[가짜 자료] 실패:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
