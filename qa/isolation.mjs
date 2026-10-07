#!/usr/bin/env node
/**
 * 격리 시험: 다른 가족·방문자·초대받은 가족이 남의 추모관·사진·편지·연락처를 보거나 고칠 수 없는지,
 * 관리자 창구가 로그인 없이·일반 회원에게 막히는지를 API 로 직접 두드려 본다.
 *
 *   node qa/isolation.mjs
 *
 * 시험 서버에 쓰기 시도를 한다(모두 거절돼야 정상). 마지막에 주인 계정으로 자료가 그대로인지 다시 본다.
 * 결과: .qa-local/results/<시각>-isolation/isolation.json. 실패가 하나라도 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { Api, fakePngDataUrl } from "./lib/api.mjs";
import { ACCOUNTS, BASE, readFixtures, resultDir } from "./lib/env.mjs";

const fx = readFixtures();
const M = fx.memorials;
const out = resultDir("isolation");
const results = [];
const check = (who, what, ok, detail = "") => {
  results.push({ who, what, ok: Boolean(ok), detail });
  console.log(`${ok ? "✓" : "✗"} [${who}] ${what}${ok ? "" : `  → ${detail}`}`);
};
const denied = r => r.status >= 400 && r.status < 500 && r.status !== 429;
const show = r => `${r.status} ${r.error?.code ?? ""} ${JSON.stringify(r.data ?? "").slice(0, 120)}`;

const visitor = new Api("방문자");
const other = new Api("다른 가족");
const member = new Api("초대받은 가족");
const owner = new Api("가족(주인)");
const admin = new Api("관리자");
await other.login(ACCOUNTS.other);
await member.login(ACCOUNTS.member);
await owner.login(ACCOUNTS.owner);
await admin.login(ACCOUNTS.admin);
const memberMe = await member.must("q", "auth.me");

const SECRET_MARKERS = ["QA-PRIVATE-LETTER", "010-0000-0012", "010-0000-0013", "가족만 보는 시험 공간", "scrypt:", "passwordHash", "qa-owner@example.com", "qa-member@example.com"];
const leaks = (r, extra = []) => [...SECRET_MARKERS, ...extra].filter(t => r.text.includes(t));

// 주인이 보는 "전" 모습 (끝에서 그대로인지 비교)
const before = {
  publicEdit: await owner.must("q", "memorial.editableBySlug", { slug: M.public.slug }),
  privateEdit: await owner.must("q", "memorial.editableBySlug", { slug: M.private.slug }),
  room: await owner.must("q", "familyRoom.manage", { memorialSlug: M.public.slug }),
  members: await owner.must("q", "familyMembers.list", { memorialSlug: M.public.slug }),
  letters: await owner.must("q", "letter.familyList", { memorialSlug: M.public.slug }),
  privateLetters: await owner.must("q", "letter.familyList", { memorialSlug: M.private.slug }),
  gallery: {
    public: await owner.must("q", "gallery.listByMemorial", { memorialId: M.public.id }),
    private: await owner.must("q", "gallery.listByMemorial", { memorialId: M.private.id }),
    draft: await owner.must("q", "gallery.listByMemorial", { memorialId: M.draft.id }),
  },
};

// 1) 읽기: 비공개·작성 중 추모관
for (const [who, api] of [["방문자", visitor], ["다른 가족", other], ["초대받은 가족", member]]) {
  for (const key of ["private", "draft"]) {
    const m = M[key];
    const label = key === "private" ? "비공개" : "작성 중";
    const reads = [
      ["memorial.bySlug", { slug: m.slug }],
      ["memorial.bySlug", { slug: m.slug, accessToken: "0".repeat(64) }],
      ["letter.byMemorial", { memorialSlug: m.slug }],
      ["gallery.listByMemorial", { memorialId: m.id }],
      ["video.listByMemorial", { memorialId: m.id }],
      ["book.listByMemorial", { memorialId: m.id }],
    ];
    for (const [p, input] of reads) {
      const r = await api.query(p, input);
      const empty = Array.isArray(r.data) && r.data.length === 0;
      check(who, `${label} 추모관 ${p}${input.accessToken ? " (가짜 입장권)" : ""} 막힘`, denied(r) || empty, show(r));
    }
    for (const p of ["memorial.editableBySlug"]) {
      const r = await api.query(p, { slug: m.slug });
      check(who, `${label} 추모관 수정 정보(${p}) 막힘`, denied(r), show(r));
    }
    const r = await api.query("letter.familyList", { memorialSlug: m.slug });
    check(who, `${label} 추모관 받은 편지 목록 막힘`, denied(r), show(r));
  }
}

// 공개 목록·검색·키오스크에 비공개·작성 중이 섞이지 않는지, 비밀 표식이 없는지
for (const [p, input] of [
  ["memorial.list", undefined],
  ["memorial.search", { keyword: "시험" }],
  ["kiosk.memorialSearch", { keyword: "시험" }],
  ["letter.recent", { limit: 100 }],
]) {
  const r = await visitor.query(p, input);
  const text = r.text;
  const mixed = [M.private.slug, M.draft.slug].filter(s => text.includes(`"${s}"`) || text.includes(`/${s}"`));
  check("방문자", `${p}: 비공개·작성 중 없음, 비밀 표식 없음`, r.status === 200 && mixed.length === 0 && leaks(r, ["010-0000-0011"]).length === 0, `${show(r)} 섞임=${mixed} 새어나감=${leaks(r)}`);
}
{
  const r = await visitor.query("kiosk.intermentSearch", { keyword: "시험고인" });
  const rows = Array.isArray(r.data) ? r.data : [];
  const rawPlace = ["시험동", "가-1-1", "선영", "010-0000-0999"].filter(t => r.text.includes(t));
  check("키오스크", "안장 기록 검색: 번호·장지 원문·원본 자료 없음", r.status === 200 && rows.length > 0 && rows.every(x => !("id" in x) && !("sourcePayload" in x)) && rawPlace.length === 0, `${show(r)} 원문=${rawPlace}`);
}
{
  const r = await visitor.query("familyRoom.status", { memorialSlug: M.public.slug });
  check("방문자", "가족관 상태: 소개글·사진 없음", r.status === 200 && leaks(r, ["가족관 시험 사진", "/family-rooms/"]).length === 0, show(r));
}

// 2) 로그인 필요한 창구: 방문자는 401
for (const [p, kind, input] of [
  ["parentFinder.search", "m", { name: "시험고인일" }],
  ["memorial.mine", "q", undefined],
  ["memorialDraft.get", "q", undefined],
  ["familyRoom.manage", "q", { memorialSlug: M.public.slug }],
  ["familyMembers.list", "q", { memorialSlug: M.public.slug }],
  ["gallery.upload", "m", { memorialId: M.public.id, dataUrl: fakePngDataUrl(), fileName: "x.png" }],
  ["memorial.create", "m", { name: "시험침입", role: "성도", birthDate: "1950-01-01", summary: "x", story: "x" }],
]) {
  const r = kind === "q" ? await visitor.query(p, input) : await visitor.mutate(p, input);
  check("방문자", `${p} 로그인 없이 막힘`, r.status === 401, show(r));
}

// 3) 관리자 창구: 방문자·일반 회원·초대받은 가족 모두 막힘
const ADMIN_READS = [
  ["memorial.adminList", undefined],
  ["memorial.adminBySlug", { slug: M.private.slug }],
  ["admin.users", undefined],
  ["admin.auditLogs", undefined],
  ["letter.adminList", { limit: 10 }],
  ["reminder.adminList", undefined],
  ["reminder.smsStatus", undefined],
  ["kioskInquiry.adminList", undefined],
  ["kioskPoster.adminList", undefined],
  ["intermentAdmin.search", { keyword: "시험" }],
];
const ADMIN_WRITES = [
  ["memorial.update", { id: M.public.id, name: "관리자사칭" }],
  ["letter.updateStatus", { id: fx.letters.public, status: "hidden" }],
  ["admin.updateUserRole", { id: memberMe.id, role: "admin" }],
  ["admin.updateUserStatus", { id: memberMe.id, approvalStatus: "rejected" }],
  ["intermentAdmin.create", { name: "시험침입", role: "", affiliation: "", pastor: "", funeralChurch: "", birthDate: "1950-01-01", deathDate: "2000-01-01", deathAge: "", burialPlace: "소망동산", burialDate: "" }],
  ["book.create", { memorialId: M.private.id, title: "침입" }],
  ["upload.image", { dataUrl: fakePngDataUrl(), fileName: "x.png" }],
  ["kioskPoster.create", { dataUrl: fakePngDataUrl(), fileName: "x.png" }],
  ["reminder.testSend", { phone: "010-0000-0000" }],
  ["system.notifyOwner", { title: "x", content: "x" }],
];
for (const [who, api] of [["방문자", visitor], ["다른 가족", other], ["초대받은 가족", member]]) {
  for (const [p, input] of ADMIN_READS) {
    const r = await api.query(p, input);
    check(who, `관리자 읽기 ${p} 막힘`, r.status === 401 || r.status === 403, show(r));
  }
  for (const [p, input] of ADMIN_WRITES) {
    const r = await api.mutate(p, input);
    // 권한 확인이 입력 확인보다 먼저라서, 입력이 틀려도 401/403 이어야 한다.
    check(who, `관리자 쓰기 ${p} 막힘`, r.status === 401 || r.status === 403, show(r));
  }
}
{
  const r = await admin.query("memorial.adminList");
  check("관리자", "관리자 창구는 관리자에게 열림", r.status === 200 && Array.isArray(r.data) && r.data.length >= 4, show(r));
}

// 4) 다른 가족이 남의 것을 고치려 하기 (모두 거절돼야 정상)
const priv = before.gallery.private[0];
const pubPhoto = before.gallery.public[0];
const roomPhoto = before.room.photos?.[0];
const attempts = [
  ["memorial.updateEditable", { id: M.public.id, name: "침입" }],
  ["memorial.updateEditable", { id: M.private.id, visibility: "public" }],
  ["memorial.completeRegistration", { slug: M.draft.slug }],
  ["memorial.delete", { id: M.public.id, confirmName: "시험공개", password: ACCOUNTS.other.password }],
  ["gallery.upload", { memorialId: M.public.id, dataUrl: fakePngDataUrl(), fileName: "x.png" }],
  ["gallery.update", { id: priv?.id, caption: "침입" }],
  ["gallery.setRepresentative", { memorialId: M.public.id, id: pubPhoto?.id }],
  // 내 추모관 번호에 남의 사진 번호를 끼워 넣기
  ["gallery.setRepresentative", { memorialId: M.other.id, id: pubPhoto?.id }],
  ["gallery.delete", { id: pubPhoto?.id }],
  ["video.create", { memorialId: M.public.id, youtubeVideoId: "dQw4w9WgXcQ" }],
  ["familyRoom.updateInfo", { memorialSlug: M.public.slug, title: "침입", intro: "침입" }],
  ["familyRoom.updatePassword", { memorialSlug: M.public.slug, password: "111111" }],
  ["familyRoom.addPhoto", { memorialSlug: M.public.slug, dataUrl: fakePngDataUrl(), fileName: "x.png" }],
  ["familyRoom.deletePhoto", { memorialSlug: M.public.slug, photoId: roomPhoto?.id ?? 1 }],
  ["familyRoom.updatePhoto", { memorialSlug: M.public.slug, photoId: roomPhoto?.id ?? 1, caption: "침입" }],
  ["familyMembers.createInvitation", { memorialSlug: M.public.slug }],
  ["familyMembers.revokeInvitation", { memorialSlug: M.public.slug }],
  ["familyMembers.removeMember", { memorialSlug: M.public.slug, userId: memberMe.id }],
  ["letter.familyUpdateStatus", { memorialSlug: M.public.slug, letterId: fx.letters.public, status: "hidden" }],
];
for (const [p, input] of attempts) {
  const r = await other.mutate(p, input);
  // 입력 형식 오류(400)로 거절된 것은 권한 시험이 아니므로 실패로 친다(시험 자체를 고쳐야 함).
  check("다른 가족", `${p} 남의 추모관 고치기 막힘`, denied(r) && r.error?.code !== "BAD_REQUEST", show(r));
}

// 자기 추모관 권한으로 남의 것을 끼워 넣기 (번호만 바꿔치기)
{
  // 다른 가족이 자기 추모관에 가족관을 만든 뒤, 남의 가족관 사진 번호로 지우기·고치기 시도
  const mine = M.other.slug;
  const status = await other.query("familyRoom.manage", { memorialSlug: mine });
  if (status.status === 200 && !status.data.exists) {
    await other.must("m", "familyRoom.create", { memorialSlug: mine, title: "시험 남의 가족관", intro: "남의 가족관", password: "135790" });
  }
  if (roomPhoto) {
    for (const [p, input] of [
      ["familyRoom.deletePhoto", { memorialSlug: mine, photoId: roomPhoto.id }],
      ["familyRoom.updatePhoto", { memorialSlug: mine, photoId: roomPhoto.id, caption: "침입" }],
      ["familyRoom.reorderPhotos", { memorialSlug: mine, photoIds: [roomPhoto.id] }],
    ]) {
      const r = await other.mutate(p, input);
      check("다른 가족", `${p}: 내 추모관 이름으로 남의 가족관 사진 번호 바꿔치기 막힘`, denied(r), show(r));
    }
  }
  for (const letterId of [fx.letters.public, fx.letters.private]) {
    const r = await other.mutate("letter.familyUpdateStatus", { memorialSlug: mine, letterId, status: "hidden" });
    check("다른 가족", `편지 ${letterId}: 내 추모관 이름으로 남의 편지 숨기기 막힘`, denied(r), show(r));
  }
}

// 초대받은 가족: 공개 추모관은 함께 관리, 나머지는 안 됨, 주인을 뺄 수 없음
{
  const ok = await member.query("memorial.editableBySlug", { slug: M.public.slug });
  check("초대받은 가족", "초대받은 추모관은 수정 정보가 열림", ok.status === 200, show(ok));
  const ownerId = before.publicEdit.createdByUserId;
  if (ownerId) {
    const r = await member.mutate("familyMembers.removeMember", { memorialSlug: M.public.slug, userId: ownerId });
    check("초대받은 가족", "주인을 가족에서 빼기 막힘", denied(r) || r.data?.success !== true, show(r));
  }
  const inv = await member.mutate("familyMembers.createInvitation", { memorialSlug: M.public.slug });
  check("초대받은 가족", "초대 링크 새로 만들기는 주인·관리자만", denied(inv), show(inv));
  const del = await member.mutate("memorial.delete", { id: M.public.id, confirmName: "시험공개", password: ACCOUNTS.member.password });
  check("초대받은 가족", "추모관 삭제 막힘", denied(del), show(del));
}

// 5) 사진 주소
{
  const plainGet = async url => (await fetch(BASE + url, { redirect: "manual" })).status;
  const pub = before.gallery.public[0]?.photoUrl;
  if (pub) check("방문자", "공개 추모관 사진은 그냥 주소로 열림", (await plainGet(pub)) === 200, pub);
  for (const [key, list] of [["비공개", before.gallery.private], ["작성 중", before.gallery.draft]]) {
    const signed = list[0]?.photoUrl ?? "";
    const plain = signed.replace(/^\/uploads\/s\/[^/]+\//, "/uploads/");
    check("방문자", `${key} 추모관 사진: 주인에게는 기한 주소로 내려옴`, /^\/uploads\/s\//.test(signed), signed);
    check("방문자", `${key} 추모관 사진: 그냥 주소는 막힘`, (await plainGet(plain)) === 404, plain);
    check("방문자", `${key} 추모관 사진: 기한 주소는 열림`, (await plainGet(signed)) === 200, signed);
    const [, stamp, sig] = signed.match(/^\/uploads\/s\/(\d+)\.([^/]+)\//) ?? [];
    if (stamp) {
      const later = signed.replace(`${stamp}.`, `${Number(stamp) + 86400}.`);
      check("방문자", `${key} 추모관 사진: 기한을 늘린 주소는 막힘`, (await plainGet(later)) === 404, later);
      const forged = signed.replace(`.${sig}/`, `.${sig.slice(0, -2)}AA/`);
      check("방문자", `${key} 추모관 사진: 서명을 바꾼 주소는 막힘`, (await plainGet(forged)) === 404, forged);
    }
  }
  if (roomPhoto?.photoUrl) {
    const plain = roomPhoto.photoUrl.replace(/^\/uploads\/s\/[^/]+\//, "/uploads/");
    check("방문자", "가족관 사진: 그냥 주소는 막힘", (await plainGet(plain)) === 404, plain);
  }
  // fetch 는 ../ 를 미리 줄여 버리므로, 주소를 그대로 보내는 http 요청으로 본다.
  const rawGet = pathAsIs =>
    new Promise(resolve => {
      const req = http.request(`${BASE}${pathAsIs}`, res => {
        let body = "";
        res.on("data", c => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      });
      req.path = pathAsIs;
      req.on("error", () => resolve({ status: 0, body: "" }));
      req.end();
    });
  for (const bad of ["/uploads/../package.json", "/uploads/%2e%2e/package.json", "/uploads/..%2fpackage.json", "/uploads/s/1.x/../../package.json"]) {
    const r = await rawGet(bad);
    check("방문자", `올린 파일 폴더 밖 경로 막힘 ${bad}`, !r.body.includes('"packageManager"'), `${r.status}`);
  }
}

// 6) 끝: 주인 계정으로 자료가 그대로인지
const after = {
  publicEdit: await owner.must("q", "memorial.editableBySlug", { slug: M.public.slug }),
  privateEdit: await owner.must("q", "memorial.editableBySlug", { slug: M.private.slug }),
  room: await owner.must("q", "familyRoom.manage", { memorialSlug: M.public.slug }),
  members: await owner.must("q", "familyMembers.list", { memorialSlug: M.public.slug }),
  letters: await owner.must("q", "letter.familyList", { memorialSlug: M.public.slug }),
  privateLetters: await owner.must("q", "letter.familyList", { memorialSlug: M.private.slug }),
  gallery: {
    public: await owner.must("q", "gallery.listByMemorial", { memorialId: M.public.id }),
    private: await owner.must("q", "gallery.listByMemorial", { memorialId: M.private.id }),
    draft: await owner.must("q", "gallery.listByMemorial", { memorialId: M.draft.id }),
  },
};
const pick = s => ({
  memorial: [s.publicEdit.name, s.publicEdit.visibility, s.publicEdit.status, s.privateEdit.visibility, s.privateEdit.status],
  room: [s.room.title, s.room.intro, s.room.photos?.map(p => `${p.id}:${p.caption}`)],
  members: s.members.members.map(m => m.userId).sort(),
  letters: [...s.letters.letters, ...s.privateLetters.letters].map(l => `${l.id}:${l.status}`),
  gallery: Object.values(s.gallery).map(list => list.map(p => `${p.id}:${p.caption}:${p.isRepresentative}`)),
});
const b = JSON.stringify(pick(before));
const a = JSON.stringify(pick(after));
check("주인", "시도가 끝난 뒤 주인의 자료가 그대로임", a === b, `전 ${b}\n후 ${a}`);

fs.writeFileSync(path.join(out, "isolation.json"), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.ok).length;
console.log(`\n격리 시험 ${results.length}건 중 실패 ${failed}건. 기록: ${out}`);
process.exit(failed ? 1 : 0);
