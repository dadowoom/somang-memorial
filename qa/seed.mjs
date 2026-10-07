#!/usr/bin/env node
/**
 * 시험 서버에 가짜 자료를 넣는다. 계정·안장 기록은 DB 에 바로 넣고,
 * 추모관·사진·가족관·초대·편지는 실제 화면이 쓰는 API 로 만든다(그 자체가 시험이다).
 *
 *   node qa/seed.mjs          이미 자료가 있으면 멈춘다
 *   node qa/seed.mjs --fresh  시험 DB 의 자료를 비우고 다시 넣는다(표는 그대로)
 *
 * 이름은 모두 "시험…" 으로 시작하고 전화는 010-0000-…, 메일은 example.com 이다.
 * 만든 대상의 주소·번호·비밀번호는 .qa-local/fixtures.json 에 적어 다른 도구가 쓴다.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Api, fakePngDataUrl } from "./lib/api.mjs";
import { ACCOUNTS, BASE, DB_NAME, DB_PORT, FIXTURE_FILE, LOCAL, REPO, requireFromRepo } from "./lib/env.mjs";

const fresh = process.argv.includes("--fresh");
const mysql = requireFromRepo("mysql2/promise");
const db = await mysql.createConnection({ host: "127.0.0.1", port: DB_PORT, user: "root", database: DB_NAME });

function hashUserPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function openIdFor(email) {
  return `local:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 56)}`;
}

const [[{ n: userCount }]] = await db.query("SELECT COUNT(*) AS n FROM users");
if (userCount > 0 && !fresh) {
  console.error("이미 자료가 있습니다. 다시 넣으려면 --fresh 를 붙이세요.");
  process.exit(1);
}
if (fresh) {
  const [tables] = await db.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_name <> '__drizzle_migrations'",
    [DB_NAME]
  );
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const { t } of tables) await db.query(`DELETE FROM \`${t}\``);
  await db.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log(`- 표 ${tables.length}개 비움`);
  fs.rmSync(path.join(LOCAL, "uploads"), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
// 편지·가입 횟수 제한은 앱 메모리에 있다. 넣기 전에 앱을 새로 켜서 푼다.
{
  const r = spawnSync(process.execPath, [path.join(REPO, "qa", "local-server.mjs"), "restart-app"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("앱 다시 켜기 실패");
}

// 1) 계정
const now = new Date();
for (const [key, a] of Object.entries(ACCOUNTS)) {
  await db.query(
    `INSERT INTO users (openId, name, email, phone, passwordHash, loginMethod, role, approvalStatus, approvedAt, lastSignedIn, termsAgreedAt, privacyAgreedAt, consentVersion)
     VALUES (?, ?, ?, ?, ?, 'local', ?, 'approved', ?, ?, ?, ?, ?)`,
    [openIdFor(a.email), a.name, a.email, a.phone ?? null, hashUserPassword(a.password), a.role ?? "user", now, now, now, now, "qa"]
  );
  console.log(`- 계정 ${key} (${a.login})`);
}

// 2) 안장 기록 (가짜). 부모님 찾기·키오스크 검색·관리자 안장 기록 시험용
const interments = [
  { sourceId: 990001, name: "시험고인일", birthDate: "1930-01-02", deathDate: "2001-03-04", burialPlace: "소망동산(시험동 09:10) 가-1-1", role: "권사" },
  { sourceId: 990002, name: "시험고인이", birthDate: "1935-05-06", deathDate: "2010-07-08", burialPlace: "소망동산(시험동 10:20) 가-1-2", role: "장로" },
  { sourceId: 990003, name: "시험고인삼", birthDate: "0000-00-00", deathDate: "1999-09-09", burialPlace: "시험도 시험군 선영(시험동 08:00 화장)", role: "성도" },
  { sourceId: 990004, name: "시험고인사", birthDate: "1940-10-10", deathDate: "2020-11-11", burialPlace: "", role: "집사" },
];
for (const r of interments) {
  await db.query(
    `INSERT INTO somang_interment_records (sourceId, name, nameNormalized, role, birthDate, deathDate, deathAge, burialPlace, burialDate, sourcePayload, funeralChurch)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, '소망교회')`,
    [r.sourceId, r.name, r.name.replace(/\s+/g, ""), r.role, r.birthDate, r.deathDate, r.burialPlace, JSON.stringify({ qa: true, phone: "010-0000-0999" })]
  );
}
console.log(`- 안장 기록 ${interments.length}건`);

// 3) API 로 추모관·사진·가족관·초대·편지
const owner = new Api("가족(주인)");
const member = new Api("초대받은 가족");
const other = new Api("다른 가족");
const visitor = new Api("방문자");
const admin = new Api("관리자");
await owner.login(ACCOUNTS.owner);
await member.login(ACCOUNTS.member);
await other.login(ACCOUNTS.other);
await admin.login(ACCOUNTS.admin);

const baseMemorial = {
  role: "권사",
  birthDate: "1932-02-03",
  deathDate: "2024-04-05",
  church: "소망교회",
  summary: "시험용 요약 문장입니다.",
  story: "시험용 이야기입니다. 실제 인물이 아닙니다.",
  familyContact: "시험 장남",
  familyPhone: "010-0000-0011",
  timeline: [{ year: "1950", title: "시험 연표", description: "가짜 연표" }],
};

async function makeMemorial(api, extra, publish = true) {
  const created = await api.must("m", "memorial.create", { ...baseMemorial, ...extra });
  if (publish) await api.must("m", "memorial.completeRegistration", { slug: created.slug });
  return created;
}

const PRIVATE_PASSWORD = "qa-secret-77";
const ROOM_PASSWORD = "482915";
const pub = await makeMemorial(owner, { name: "시험공개", slug: "qa-public", visibility: "public", memorialDay: "4월 5일" });
const priv = await makeMemorial(owner, { name: "시험비공개", slug: "qa-private", visibility: "private", accessPassword: PRIVATE_PASSWORD, familyPhone: "010-0000-0012" });
const draft = await makeMemorial(owner, { name: "시험작성중", slug: "qa-draft", visibility: "public", familyPhone: "010-0000-0013" }, false);
const others = await makeMemorial(other, { name: "시험남의공개", slug: "qa-other-public", visibility: "public", familyPhone: "010-0000-0014" });
console.log(`- 추모관 4개: ${[pub, priv, draft, others].map(m => m.slug).join(", ")}`);

// 사진 (공개·비공개·작성 중 각 1장, 공개는 프로필 사진)
const photo = {};
for (const [key, m, rgb] of [["public", pub, [180, 120, 90]], ["private", priv, [90, 120, 180]], ["draft", draft, [90, 180, 120]]]) {
  const r = await owner.must("m", "gallery.upload", {
    memorialId: m.id,
    dataUrl: fakePngDataUrl(48, rgb),
    fileName: `qa-${key}.png`,
    caption: `시험 사진 ${key}`,
    asProfile: key === "public",
  });
  photo[key] = { id: r.id, url: r.url };
}
console.log("- 추억 사진 3장");

// 가족관 (공개 추모관에) + 사진 1장
await owner.must("m", "familyRoom.create", { memorialSlug: pub.slug, title: "시험 가족관", intro: "가족만 보는 시험 공간", password: ROOM_PASSWORD });
await owner.must("m", "familyRoom.addPhoto", { memorialSlug: pub.slug, dataUrl: fakePngDataUrl(40, [200, 60, 60]), fileName: "qa-room.png", caption: "가족관 시험 사진" });
const roomManage = await owner.must("q", "familyRoom.manage", { memorialSlug: pub.slug });
const roomPhoto = roomManage.photos?.[0];
console.log("- 가족관 + 사진 1장");

// 가족 초대 → 받기
const invite = await owner.must("m", "familyMembers.createInvitation", { memorialSlug: pub.slug });
const inviteToken = invite.href.split("/").pop();
await member.must("m", "familyMembers.acceptInvitation", { token: inviteToken });
// 초대 링크는 한 번 쓰면 끝나는지 모르므로, 격리 시험용으로 새 링크를 하나 더 만들어 둔다.
const invite2 = await owner.must("m", "familyMembers.createInvitation", { memorialSlug: pub.slug });
console.log("- 가족 초대 수락(시험가족이)");

// 편지
const access = await visitor.must("m", "memorial.verifyAccess", { slug: priv.slug, password: PRIVATE_PASSWORD });
const letterPublic = await visitor.must("m", "letter.create", { memorialSlug: pub.slug, author: "시험방문자", content: "공개 추모관에 남기는 시험 편지" });
const letterPrivate = await visitor.must("m", "letter.create", { memorialSlug: priv.slug, accessToken: access.accessToken, author: "시험방문자", content: "비공개 추모관 비밀 편지 QA-PRIVATE-LETTER" });
const letterOther = await visitor.must("m", "letter.create", { memorialSlug: others.slug, author: "시험방문자", content: "남의 추모관 편지" });
const letterFree = await visitor.must("m", "letter.create", { recipientName: "시험받는분", author: "시험방문자", content: "추모관 없는 편지" });
console.log("- 편지 4통");

const fixtures = {
  base: BASE,
  createdAt: new Date().toISOString(),
  accounts: Object.fromEntries(Object.entries(ACCOUNTS).map(([k, a]) => [k, { login: a.login }])),
  memorials: {
    public: { id: pub.id, slug: pub.slug },
    private: { id: priv.id, slug: priv.slug, password: PRIVATE_PASSWORD },
    draft: { id: draft.id, slug: draft.slug },
    other: { id: others.id, slug: others.slug },
  },
  familyRoom: { slug: pub.slug, password: ROOM_PASSWORD, photoId: roomPhoto?.id ?? null, photoUrl: roomPhoto?.photoUrl ?? roomPhoto?.url ?? null },
  photos: photo,
  invitation: { unusedToken: invite2.href.split("/").pop() },
  letters: {
    public: letterPublic.id,
    private: letterPrivate.id,
    other: letterOther.id,
    free: letterFree.id,
  },
  interments: interments.map(r => ({ name: r.name, birthDate: r.birthDate })),
};
fs.writeFileSync(FIXTURE_FILE, JSON.stringify(fixtures, null, 2));
await db.end();
console.log(`끝. ${FIXTURE_FILE}`);
