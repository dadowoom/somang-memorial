#!/usr/bin/env node
/**
 * 끝까지 눌러 보기 (브라우저로 실제 화면을 누른다. 시험 DB 에 자료가 생긴다).
 *
 *   node qa/flows.mjs               모든 흐름
 *   node qa/flows.mjs --only=letter 한 흐름만 (create, letter, invite, finder, interment, password, book, inquiry, media)
 *   QA_HEADED=1 node qa/flows.mjs   브라우저 창을 띄워 눈으로 보기
 *
 * 흐름마다 "준비 → 신청·작성 → 처리 → 결과 확인"까지 본다. 결과: .qa-local/results/<시각>-flows/
 * 실패한 단계는 화면 사진을 남긴다. 실패가 하나라도 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import { Api, fakePngDataUrl } from "./lib/api.mjs";
import { ACCOUNTS, BASE, loadPlaywright, readFixtures, resultDir } from "./lib/env.mjs";

const fx = readFixtures();
const M = fx.memorials;
const only = process.argv.find(a => a.startsWith("--only="))?.slice(7);
const out = resultDir("flows");
const pw = loadPlaywright();
const browser = await pw.chromium
  .launch({ headless: !process.env.QA_HEADED })
  .catch(() => pw.chromium.launch({ channel: "msedge", headless: !process.env.QA_HEADED }));

const results = [];
const stamp = Date.now().toString(36).slice(-4);
const pngFile = (name, rgb) => {
  const file = path.join(out, name);
  fs.writeFileSync(file, Buffer.from(fakePngDataUrl(64, rgb).split(",")[1], "base64"));
  return file;
};

async function newPage(size = "pc") {
  const context = await browser.newContext({
    viewport: size === "phone" ? { width: 375, height: 812 } : { width: 1280, height: 900 },
    isMobile: size === "phone",
    hasTouch: size === "phone",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  const page = await context.newPage();
  page.on("dialog", d => void d.accept());
  page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e).slice(0, 200)));
  page.on("response", r => {
    if (r.url().includes("/api/") && r.status() >= 500) page.errors.push(`${r.status()} ${r.url().split("/api/trpc/")[1]?.split("?")[0]}`);
  });
  return page;
}

async function uiLogin(page, account) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("아이디 또는 이메일 주소").fill(account.login);
  await page.getByPlaceholder("비밀번호", { exact: true }).fill(account.password);
  await page.locator("form").getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 15000 });
}

async function apiMe(page) {
  return page.evaluate(async () => (await (await fetch("/api/trpc/auth.me")).json())?.result?.data?.json ?? null);
}

async function flow(name, label, fn) {
  if (only && only !== name) return;
  const steps = [];
  const step = (what, ok, detail = "") => {
    steps.push({ what, ok: Boolean(ok), detail });
    console.log(`  ${ok ? "✓" : "✗"} ${what}${ok ? "" : `  → ${detail}`}`);
    if (!ok) throw new Error(`${what}: ${detail}`);
  };
  console.log(`▶ ${label}`);
  const pages = [];
  const open = async size => {
    const p = await newPage(size);
    pages.push(p);
    return p;
  };
  let error = null;
  try {
    await fn({ step, open });
  } catch (e) {
    error = String(e.message ?? e).slice(0, 300);
    if (!steps.some(s => !s.ok)) console.log(`  ✗ 멈춤: ${error}`);
    let n = 0;
    for (const p of pages) await p.screenshot({ path: path.join(out, `${name}-fail-${++n}.png`), fullPage: true }).catch(() => {});
  }
  const pageErrors = pages.flatMap(p => p.errors);
  if (pageErrors.length) console.log(`  ! 화면 오류: ${[...new Set(pageErrors)].slice(0, 3).join(" | ")}`);
  for (const p of pages) await p.context().close().catch(() => {});
  results.push({ name, label, ok: !error && pageErrors.length === 0, error, pageErrors, steps });
}

// 1) 추모관 만들기 → 사진 → 등록 완료 → 가족 초대 → 편지 → 숨기기
let created = null;
await flow("create", "추모관 만들기(5단계) → 사진 → 등록 완료", async ({ step, open }) => {
  const page = await open("pc");
  await uiLogin(page, ACCOUNTS.flow);
  await page.goto(`${BASE}/memorial/create`, { waitUntil: "networkidle" });
  const fresh = page.getByRole("button", { name: "지우고 새로 쓰기" });
  if (await fresh.isVisible().catch(() => false)) await fresh.click();
  const name = `시험흐름${stamp}`;
  await page.getByPlaceholder("김소망").fill(name);
  await page.locator("select").first().selectOption("권사");
  await page.getByPlaceholder("1933 또는 1933-01-01").fill("1941-02-03");
  await page.getByPlaceholder("2026 또는 2026-01-01").fill("2025-06-07");
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByPlaceholder("믿음과 사랑으로 가족과 교회를 섬긴 분").fill("흐름 시험 요약");
  await page.getByPlaceholder("고인의 삶, 신앙, 가족에게 남긴 기억을 간결하게 적어 주세요.").fill("흐름 시험 이야기. 가짜 인물입니다.");
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: /다음 · 사진 안내/ }).click();
  await page.getByRole("button", { name: /다음 · 공개 설정/ }).click();
  await page.getByRole("group", { name: "공개 범위" }).getByRole("button", { name: /전체 공개/ }).click();
  await page.getByRole("button", { name: /추모관 만들기/ }).click();
  await page.getByText("생성 완료").waitFor({ timeout: 15000 });
  step("5단계를 채우고 '추모관 만들기' → 생성 완료", true);
  const api = new Api("흐름");
  await api.login(ACCOUNTS.flow);
  const mine = await api.must("q", "memorial.mine");
  created = mine.find(m => m.name === name);
  step("내 추모관 목록에 '작성 중'으로 보임", created && created.status === "pending", JSON.stringify(created ?? null));
  const visitorView = await new Api("방문자").query("memorial.bySlug", { slug: created.slug });
  step("등록 완료 전에는 방문자에게 안 보임", visitorView.status === 403, String(visitorView.status));

  // 사진 올리기 (추억 앨범)
  await page.goto(`${BASE}/memorial/${created.slug}/archive#gallery`, { waitUntil: "networkidle" });
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(pngFile(`flow-photo-${stamp}.png`, [30, 90, 150]));
  await page.waitForTimeout(3000);
  const photos = await api.must("q", "gallery.listByMemorial", { memorialId: created.id });
  step("앨범에 사진 1장 올라감", photos.length >= 1, `${photos.length}장`);

  // 등록 완료
  await page.goto(`${BASE}/my/memorials`, { waitUntil: "networkidle" });
  // 이 추모관 줄의 '등록 완료하기'만 누른다(누르면 단추 글자가 바뀌므로 클릭 전에 잡는다).
  const row = page
    .locator(":is(tr,li,article,section,div)", { hasText: name, has: page.getByRole("button", { name: "등록 완료하기" }) })
    .last();
  await row.getByRole("button", { name: "등록 완료하기" }).click();
  // 결과는 화면 글자 대신 실제로 방문자에게 보이는지로 확인한다(단추 글자 바뀜에 흔들리지 않게).
  let after = { status: 0 };
  for (let i = 0; i < 20 && after.status !== 200; i += 1) {
    after = await new Api("방문자").query("memorial.bySlug", { slug: created.slug });
    if (after.status !== 200) await page.waitForTimeout(500);
  }
  step("등록 완료하면 방문자에게 보임", after.status === 200, String(after.status));
  const listed = await new Api("방문자").query("memorial.search", { keyword: name });
  step("공개 검색에 나옴", listed.data?.some(m => m.slug === created.slug), JSON.stringify(listed.data?.map(m => m.slug)));
});

await flow("invite", "가족 초대 링크 → 다른 계정이 받기 → 함께 관리", async ({ step, open }) => {
  const slug = created?.slug ?? M.public.slug;
  const ownerAccount = created ? ACCOUNTS.flow : ACCOUNTS.owner;
  const page = await open("pc");
  await uiLogin(page, ownerAccount);
  await page.goto(`${BASE}/my/memorials/${slug}/family-members`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /링크 만들기/ }).first().click();
  const linkBox = page.getByLabel("가족 초대 링크");
  await linkBox.waitFor({ timeout: 10000 });
  const link = await linkBox.inputValue();
  step("초대 링크가 한 번 보임", /\/invite\/[\w-]{20,}/.test(link), link.replace(/[\w-]{20,}$/, "…"));
  const guest = await open("phone");
  await uiLogin(guest, ACCOUNTS.other);
  await guest.goto(link.startsWith("http") ? link : BASE + link, { waitUntil: "networkidle" });
  await guest.getByRole("button", { name: /함께|받기|참여|수락/ }).first().click();
  await guest.waitForTimeout(1500);
  const otherApi = new Api("다른 가족");
  await otherApi.login(ACCOUNTS.other);
  const editable = await otherApi.query("memorial.editableBySlug", { slug });
  step("초대받은 계정이 수정 화면을 열 수 있음", editable.status === 200, String(editable.status));
  await page.reload({ waitUntil: "networkidle" });
  step("주인 화면 가족 목록에 새 가족이 보임", (await page.locator("body").innerText()).includes(ACCOUNTS.other.name));
  // 뒷정리: 다른 가족을 빼서 격리 시험 자료를 원래대로 둔다
  const me = await otherApi.must("q", "auth.me");
  const ownerApi = new Api("주인");
  await ownerApi.login(ownerAccount);
  await ownerApi.must("m", "familyMembers.removeMember", { memorialSlug: slug, userId: me.id });
  const gone = await otherApi.query("memorial.editableBySlug", { slug });
  step("주인이 빼면 다시 못 고침", gone.status === 404 || gone.status === 403, String(gone.status));
});

await flow("letter", "편지 남기기 → 가족이 숨기기 → 방문자 화면에서 사라짐", async ({ step, open }) => {
  const slug = created?.slug ?? M.public.slug;
  const ownerAccount = created ? ACCOUNTS.flow : ACCOUNTS.owner;
  const visitor = await open("phone");
  await visitor.goto(`${BASE}/memorial/${slug}`, { waitUntil: "networkidle" });
  const text = `흐름 편지 ${stamp}`;
  await visitor.getByPlaceholder("보내는 분의 이름").fill("시험방문자");
  await visitor.getByPlaceholder("전하고 싶은 마음을 남겨 주세요.").fill(text);
  await visitor.getByRole("button", { name: "편지 남기기" }).click();
  await visitor.getByText(text).first().waitFor({ timeout: 10000 });
  step("방문자가 편지를 남기면 바로 보임", true);
  const owner = await open("pc");
  await uiLogin(owner, ownerAccount);
  await owner.goto(`${BASE}/my/memorials/${slug}/letters`, { waitUntil: "networkidle" });
  const item = owner.locator("li", { hasText: text });
  await item.getByRole("button", { name: "이 편지 숨기기" }).click();
  await item.getByRole("button", { name: "다시 보이게 하기" }).waitFor({ timeout: 10000 });
  step("가족 화면에서 '이 편지 숨기기' → '다시 보이게 하기'로 바뀜", true);
  await visitor.reload({ waitUntil: "networkidle" });
  step("방문자 화면에서 숨긴 편지가 사라짐", !(await visitor.locator("body").innerText()).includes(text));
  const recent = await new Api("방문자").query("letter.recent", { limit: 100 });
  step("전체 편지 목록에서도 사라짐", !recent.text.includes(text));
});

await flow("finder", "부모님 찾기 → 추모관 시작 → 다른 계정은 못 들어감", async ({ step, open }) => {
  const page = await open("phone");
  await uiLogin(page, ACCOUNTS.flow);
  await page.goto(`${BASE}/my/find-parent`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("성함을 입력해 주세요").fill("시험고인사");
  await page.getByRole("button", { name: "우리 부모님 찾기" }).click();
  await page.getByText("시험고인사").first().waitFor({ timeout: 10000 });
  step("이름으로 찾으면 기록이 나옴", true);
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: "이분의 추모관 시작하기" }).first().click();
  await page.waitForURL(u => /\/my\/memorials\/.+\/edit|\/memorial\//.test(u.pathname), { timeout: 15000 }).catch(() => {});
  const api = new Api("흐름");
  await api.login(ACCOUNTS.flow);
  const mine = await api.must("q", "memorial.mine");
  const claimed = mine.find(m => m.name === "시험고인사");
  step("내 추모관에 비공개·작성 중으로 생김", claimed && claimed.visibility === "private" && claimed.status === "pending", JSON.stringify(claimed ?? null));
  const other = new Api("다른 가족");
  await other.login(ACCOUNTS.other);
  const found = await other.must("m", "parentFinder.search", { name: "시험고인사" });
  const row = found.find(r => r.name === "시험고인사");
  step("다른 계정이 찾으면 '이미 있음'으로만 보이고 주소는 없음", row?.memorial?.state === "restricted" && !row.memorial.href, JSON.stringify(row?.memorial));
  const view = await other.query("memorial.bySlug", { slug: claimed.slug });
  step("다른 계정은 그 추모관을 못 봄", view.status === 403, String(view.status));
});

await flow("interment", "관리자: 안장 기록 찾기 → 고치기 → 키오스크 검색 반영", async ({ step, open }) => {
  const page = await open("pc");
  await uiLogin(page, ACCOUNTS.admin);
  await page.goto(`${BASE}/admin/interment`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("성함으로 찾기 (예: 김소망)").fill("시험고인이");
  await page.getByRole("button", { name: "찾기", exact: true }).click();
  await page.getByText("‘시험고인이’ 1건").waitFor({ timeout: 10000 });
  step("관리자 화면에서 이름으로 찾음", true);
  await page.getByRole("button", { name: "고치기" }).first().click();
  const date = page.getByLabel("안장일");
  await date.fill("2010-07-10");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByText(/안장 2010-07-10/).waitFor({ timeout: 10000 });
  step("안장일을 고쳐 저장하면 목록에 반영", true);
  const kiosk = await new Api("키오스크").query("kiosk.intermentSearch", { keyword: "시험고인이" });
  step("키오스크 검색에도 반영", kiosk.data?.[0]?.burialDate === "2010-07-10", JSON.stringify(kiosk.data?.[0]));
  const admin = new Api("관리자");
  await admin.login(ACCOUNTS.admin);
  const logs = await admin.must("q", "admin.auditLogs", { limit: 50 });
  step("관리 기록(interment.*)이 남음", JSON.stringify(logs).includes("interment."), "기록 없음");
});

await flow("password", "비밀번호 바꾸기 → 다른 기기 로그아웃 → 다른 기기 모두 로그아웃", async ({ step, open }) => {
  const a = ACCOUNTS.flow;
  const next = `${a.password}x`;
  const pageA = await open("pc");
  const pageB = await open("phone");
  await uiLogin(pageA, a);
  await uiLogin(pageB, a);
  step("두 기기에서 로그인", (await apiMe(pageA)) && (await apiMe(pageB)));
  await pageA.goto(`${BASE}/my/account`, { waitUntil: "networkidle" });
  const pwForm = pageA.locator("form", { has: pageA.getByPlaceholder("새 비밀번호 (8자 이상)") });
  await pwForm.getByPlaceholder("지금 비밀번호").fill(a.password);
  await pwForm.getByPlaceholder("새 비밀번호 (8자 이상)").fill(next);
  await pwForm.getByPlaceholder("새 비밀번호 한 번 더").fill(next);
  await pwForm.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await pageA.waitForTimeout(1500);
  step("바꾼 기기는 로그인 유지", Boolean(await apiMe(pageA)));
  step("다른 기기는 로그아웃됨", !(await apiMe(pageB)));
  const oldLogin = await new Api("옛 비밀번호").mutate("auth.login", { identifier: a.login, password: a.password });
  step("옛 비밀번호로는 로그인 안 됨", oldLogin.status === 401, String(oldLogin.status));
  // 다른 기기 모두 로그아웃
  await uiLogin(pageB, { ...a, password: next });
  const devForm = pageA.locator("form", { hasText: "다른 기기 모두 로그아웃" });
  await devForm.getByPlaceholder("지금 비밀번호").fill(next);
  await devForm.getByRole("button", { name: "다른 기기 모두 로그아웃" }).click();
  await pageA.waitForTimeout(1500);
  step("'다른 기기 모두 로그아웃' 뒤 이 기기는 유지", Boolean(await apiMe(pageA)));
  step("다른 기기는 끊김", !(await apiMe(pageB)));
  // 되돌리기 (다음 회차를 위해)
  const api = new Api("흐름");
  await api.login({ ...a, password: next });
  await api.must("m", "auth.changePassword", { currentPassword: next, newPassword: a.password });
});

await flow("book", "추억책: 관리자가 책·쪽 만들기 → 방문자가 보기", async ({ step, open }) => {
  const admin = new Api("관리자");
  await admin.login(ACCOUNTS.admin);
  const title = `시험 추억책 ${stamp}`;
  const up = await admin.must("m", "upload.image", { dataUrl: fakePngDataUrl(64, [150, 150, 60]), fileName: "cover.png", folder: "book-covers" });
  await admin.must("m", "book.create", { memorialId: M.public.id, title, coverPhotoUrl: up.url, coverPhotoKey: up.key });
  const books = await admin.must("q", "book.listByMemorial", { memorialId: M.public.id });
  const book = books.find(b => b.title === title);
  await admin.must("m", "book.addPage", { bookId: book.id, title: "첫 쪽", content: "추억책 시험 본문" });
  step("관리자가 책과 쪽을 만듦", Boolean(book));
  const page = await open("phone");
  await page.goto(`${BASE}/memorial/${M.public.slug}/archive`, { waitUntil: "networkidle" });
  step("방문자 추억 화면에 책 제목이 보임", (await page.locator("body").innerText()).includes(title));
  const cover = await fetch(BASE + up.url);
  step("공개 추모관 책 표지 사진이 열림", cover.status === 200, String(cover.status));
  await admin.must("m", "book.delete", { id: book.id });
});

await flow("inquiry", "제작 문의 → 관리자 화면에 접수", async ({ step, open }) => {
  const page = await open("phone");
  await page.goto(`${BASE}/guide`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /문의하기/ }).first().click();
  const phone = `0100000${String(Date.now()).slice(-4)}`;
  await page.getByPlaceholder("010-0000-0000").fill(phone);
  await page.getByPlaceholder("예: 김소망").fill("시험문의");
  await page.getByRole("button", { name: /문의 신청/ }).click();
  await page.waitForTimeout(1500);
  const admin = new Api("관리자");
  await admin.login(ACCOUNTS.admin);
  const list = await admin.must("q", "kioskInquiry.adminList");
  step("관리자 문의 목록에 들어옴", JSON.stringify(list).includes(phone.slice(-4)), "목록에 없음");
  const adminPage = await open("pc");
  await uiLogin(adminPage, ACCOUNTS.admin);
  await adminPage.goto(`${BASE}/admin/operations`, { waitUntil: "networkidle" });
  await adminPage.waitForTimeout(800);
  step("관리자 운영 화면에서 문의가 보임", (await adminPage.locator("body").innerText()).includes("시험문의"));
});

await flow("media", "가족관·비공개 사진: 비밀번호 전에는 안 보이고, 기한 주소는 6~13시간", async ({ step, open }) => {
  const page = await open("phone");
  await page.goto(`${BASE}/memorial/${fx.familyRoom.slug}/family`, { waitUntil: "networkidle" });
  step("비밀번호 전에는 가족관 사진이 없음", (await page.locator('img[src*="/family-rooms/"]').count()) === 0);
  await page.getByPlaceholder("숫자 비밀번호를 입력해 주세요").fill(fx.familyRoom.password);
  await page.getByRole("button", { name: "비밀번호 확인" }).click();
  const img = page.locator('img[src*="/family-rooms/"]').first();
  await img.waitFor({ timeout: 10000 });
  const src = await img.getAttribute("src");
  const exp = Number(src.match(/\/uploads\/s\/(\d+)\./)?.[1] ?? 0);
  const hours = (exp * 1000 - Date.now()) / 3_600_000;
  step("가족관 사진은 기한 주소로 보임", exp > 0, src);
  step("기한은 약 6~13시간 뒤", hours >= 5.9 && hours <= 13, `${hours.toFixed(1)}시간`);
  const loaded = await img.evaluate(el => el.complete && el.naturalWidth > 0);
  step("사진이 실제로 열림", loaded);
  const plain = src.replace(/^\/uploads\/s\/[^/]+\//, "/uploads/");
  step("그냥 주소로는 막힘", (await fetch(BASE + plain)).status === 404, plain);
  // 비공개 추모관: 비밀번호로 들어가 사진 보기
  const p2 = await open("pc");
  await p2.goto(`${BASE}/memorial/${M.private.slug}/archive`, { waitUntil: "networkidle" });
  step("비공개 추모관 사진은 비밀번호 전에 없음", (await p2.locator(`img[src*="/gallery/${M.private.id}/"]`).count()) === 0);
});

await browser.close();
fs.writeFileSync(path.join(out, "flows.json"), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.ok);
console.log(`\n흐름 ${results.length}개 중 실패 ${failed.length}개${failed.length ? ` (${failed.map(f => f.name).join(", ")})` : ""}. 기록: ${out}`);
process.exit(failed.length ? 1 : 0);
