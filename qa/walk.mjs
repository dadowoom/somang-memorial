#!/usr/bin/env node
/**
 * 모든 화면 자동 순회 (읽기만 — 저장·편지·문의 단추는 누르지 않는다).
 *
 *   node qa/walk.mjs                 역할 6개(방문자·가족·초대받은 가족·다른 가족·관리자·키오스크) × 크기(PC·휴대폰, 키오스크는 세로 1080×1920)
 *   node qa/walk.mjs --only=visitor  한 역할만
 *
 * 화면마다 모으는 것: 없는 페이지 / API 오류(4xx·5xx) / 화면 오류(콘솔) / 가로 넘침 / 로그인 풀림 /
 * 그 역할이 보면 안 되는 글자(비공개 편지·연락처·다른 가족 메일 등)가 화면이나 API 응답에 나오는지.
 * 결과: .qa-local/results/<시각>-walk/ (pages.json, 화면 사진). 문제가 하나라도 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import { Api } from "./lib/api.mjs";
import { ACCOUNTS, BASE, launchBrowser, readFixtures, resultDir } from "./lib/env.mjs";

const fx = readFixtures();
const only = process.argv.find(a => a.startsWith("--only="))?.slice(7);
const out = resultDir("walk");
const M = fx.memorials;

// 어느 역할도 보면 안 되는 것 (비밀번호 흔적)
const NEVER = ["scrypt:", "accessPasswordHash", "passwordHash", "tokenHash"];
// 가족이 아닌 사람이 보면 안 되는 것 (seed.mjs 가 심어 둔 표식)
const FAMILY_ONLY = [
  "QA-PRIVATE-LETTER", // 비공개 추모관 편지
  "010-0000-0012", // 비공개 추모관 연락처
  "010-0000-0013", // 작성 중 추모관 연락처
  "가족만 보는 시험 공간", // 가족관 소개글
  "가족관 시험 사진",
  "qa-owner@example.com",
  "qa-member@example.com",
  "010-0000-0001", // 주인 회원 전화
  "010-0000-0002", // 초대받은 가족 회원 전화
];
// 관리자 말고는 보면 안 되는 것 (안장 기록 원문)
const ADMIN_ONLY = ["시험동 09:10", "가-1-1", "시험군 선영", "010-0000-0999"];

const PUBLIC_PAGES = [
  "/", "/login", "/login?mode=signup", "/guide", "/memorial/search", "/somang-hill", "/services/life-garden",
  "/letters", "/privacy", "/terms", "/forgot-password", "/reset-password", "/없는-주소",
  `/memorial/${M.public.slug}`, `/memorial/${M.public.slug}/archive`, `/memorial/${M.public.slug}/family`,
  `/memorial/${M.public.slug}/obituary`, `/memorial/${M.other.slug}`,
  // 아래는 방문자에게 막혀야 정상인 곳 (denied)
  [`/memorial/${M.private.slug}`, "denied"], [`/memorial/${M.private.slug}/obituary`, "denied"],
  [`/memorial/${M.private.slug}/archive`, "denied"], [`/memorial/${M.draft.slug}`, "denied"],
  [`/memorial/${M.draft.slug}/obituary`, "denied"],
];
const MEMBER_PAGES = [
  "/my/account", "/my/memorials", "/my/find-parent", "/memorial/create",
  `/my/memorials/${M.public.slug}/edit`, `/my/memorials/${M.public.slug}/family`,
  `/my/memorials/${M.public.slug}/family-members`, `/my/memorials/${M.public.slug}/letters`,
];
const OWNER_EXTRA = [
  `/my/memorials/${M.private.slug}/edit`, `/my/memorials/${M.private.slug}/letters`,
  `/my/memorials/${M.draft.slug}/edit`, `/memorial/${M.private.slug}`, `/memorial/${M.draft.slug}`,
];
const OTHER_DENIED = [
  `/my/memorials/${M.public.slug}/edit`, `/my/memorials/${M.public.slug}/family`,
  `/my/memorials/${M.public.slug}/family-members`, `/my/memorials/${M.public.slug}/letters`,
  `/my/memorials/${M.private.slug}/edit`, `/my/memorials/${M.draft.slug}/edit`,
  "/admin", "/admin/users", "/admin/operations", "/admin/interment", "/admin/kiosk",
  `/admin/memorials/${M.public.slug}/edit`,
].map(p => [p, "denied"]);
const ADMIN_PAGES = [
  "/admin", "/admin/users", "/admin/operations", "/admin/kiosk", "/admin/interment",
  `/admin/memorials/${M.public.slug}/edit`, `/admin/memorials/${M.private.slug}/edit`,
  `/admin/memorials/${M.draft.slug}/edit`, `/memorial/${M.private.slug}`, `/memorial/${M.draft.slug}`,
];
const KIOSK_PAGES = [
  "/kiosk", `/kiosk/memorial/${M.public.slug}`, `/kiosk/memorial/${M.other.slug}`,
  [`/kiosk/memorial/${M.private.slug}`, "denied"], [`/kiosk/memorial/${M.draft.slug}`, "denied"], "/kiosk/없는-주소",
];

const norm = list => list.map(p => (Array.isArray(p) ? { url: p[0], denied: true } : { url: p, denied: false }));
const ROLES = [
  { key: "visitor", label: "방문자", account: null, pages: norm([...PUBLIC_PAGES, ...MEMBER_PAGES.map(p => [p, "denied"]), ...OTHER_DENIED.filter(([p]) => p.startsWith("/admin"))]), forbidden: [...FAMILY_ONLY, ...ADMIN_ONLY, "010-0000-0011", "010-0000-0014"] },
  { key: "owner", label: "가족(주인)", account: ACCOUNTS.owner, pages: norm([...PUBLIC_PAGES.filter(p => !Array.isArray(p)), ...MEMBER_PAGES, ...OWNER_EXTRA]), forbidden: ADMIN_ONLY },
  { key: "member", label: "초대받은 가족", account: ACCOUNTS.member, pages: norm([
      // 초대받은 가족은 가족 초대 화면을 쓰지 않는다(주인·관리자만). 화면에 들어가는 단추도 없다.
      ...MEMBER_PAGES.map(p => (p.endsWith("/family-members") ? [p, "denied"] : p)),
      `/memorial/${M.public.slug}`,
      [`/my/memorials/${M.private.slug}/edit`, "denied"],
      [`/my/memorials/${M.private.slug}/letters`, "denied"],
    ]), forbidden: [...ADMIN_ONLY, "QA-PRIVATE-LETTER", "010-0000-0012", "010-0000-0013"] },
  { key: "other", label: "다른 가족", account: ACCOUNTS.other, pages: norm([...PUBLIC_PAGES, "/my/memorials", "/my/account", `/my/memorials/${M.other.slug}/edit`, ...OTHER_DENIED]), forbidden: [...FAMILY_ONLY, ...ADMIN_ONLY, "010-0000-0011"] },
  { key: "admin", label: "관리자", account: ACCOUNTS.admin, pages: norm(ADMIN_PAGES), forbidden: [] },
  { key: "kiosk", label: "키오스크", account: null, pages: norm(KIOSK_PAGES), forbidden: [...FAMILY_ONLY, ...ADMIN_ONLY, "010-0000-0011", "010-0000-0014"], kiosk: true },
];
const SIZES = [
  { key: "pc", width: 1280, height: 900, mobile: false },
  { key: "phone", width: 375, height: 812, mobile: true },
];
const KIOSK_SIZE = { key: "kiosk", width: 1080, height: 1920, mobile: false, touch: true };

const browser = await launchBrowser();
const results = [];
let shotNo = 0;

for (const role of ROLES.filter(r => !only || r.key === only)) {
  const api = new Api(role.label);
  if (role.account) await api.login(role.account);
  for (const size of role.kiosk ? [KIOSK_SIZE] : SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: size.mobile,
      hasTouch: size.mobile || size.touch === true,
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
    });
    if (role.account) await context.addCookies(api.browserCookies().map(c => ({ name: c.name, value: c.value, url: BASE })));
    const page = await context.newPage();
    let current = null;
    page.on("console", m => {
      if (current && m.type() === "error") current.console.push(m.text().slice(0, 200));
    });
    page.on("pageerror", e => current?.console.push(`pageerror ${String(e).slice(0, 200)}`));
    page.on("response", async res => {
      if (!current) return;
      const url = res.url();
      if (!url.includes("/api/")) return;
      const name = decodeURIComponent(url.split("/api/trpc/")[1] ?? url).split("?")[0];
      if (res.status() >= 400) current.api.push(`${res.status()} ${name}`);
      try {
        const body = await res.text();
        for (const t of [...NEVER, ...role.forbidden]) if (body.includes(t)) current.apiLeak.add(`${t} ← ${name}`);
      } catch {
        // 응답 본문을 못 읽는 경우(이동 등)는 넘어간다
      }
    });

    for (const target of role.pages) {
      current = { role: role.key, size: size.key, url: target.url, denied: target.denied, api: [], console: [], apiLeak: new Set() };
      try {
        const res = await page.goto(BASE + encodeURI(target.url), { waitUntil: "networkidle", timeout: 30000 });
        current.status = res?.status();
        await page.waitForTimeout(300);
        const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
        current.finalPath = decodeURI(new URL(page.url()).pathname);
        current.notFound = /페이지를 찾지 못했습니다|화면을 찾지 못했습니다|NOT FOUND/.test(text);
        current.textLeak = [...NEVER, ...role.forbidden].filter(t => text.includes(t));
        current.overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        // 로그인 화면으로 갔거나 로그인 칸이 떠 있으면 로그인이 풀린 것 (안내 글의 "다시 로그인" 같은 말은 세지 않는다)
        current.loginShown =
          current.finalPath === "/login" ||
          (await page.getByPlaceholder("아이디 또는 이메일 주소").count()) > 0;
        current.textSample = text.slice(0, 160);
        // 추모관 본문(시드의 이야기 문장)이 보이면 막힌 것이 아니다.
        current.contentShown = /시험용 이야기입니다|시험용 요약 문장/.test(text);
      } catch (error) {
        current.error = String(error).split("\n")[0].slice(0, 160);
      }
      current.shot = `${String(++shotNo).padStart(3, "0")}-${role.key}-${size.key}.png`;
      await page.screenshot({ path: path.join(out, current.shot), fullPage: false }).catch(() => {});
      current.apiLeak = [...current.apiLeak];
      results.push(current);
    }
    await context.close();
  }
}
await browser.close();

// 판정
// 막혀야 정상인 화면에서 서버가 거절한 것을 화면이 콘솔에 적는 것은 문제로 치지 않는다.
const screenErrors = r =>
  r.console.filter(c => !/Failed to load resource/.test(c) && !(r.denied && /TRPCClientError/.test(c)));
let problems = 0;
const lines = [];
for (const r of results) {
  const expectedMissing = r.url.includes("없는-주소");
  const hardApi = r.api.filter(a => /^5\d\d/.test(a));
  const softApi = r.api.filter(a => /^4\d\d/.test(a));
  const flags = [
    r.error && `열기실패(${r.error})`,
    !r.denied && !expectedMissing && r.notFound && "없는페이지",
    expectedMissing && !r.notFound && "없는주소인데안내없음",
    hardApi.length && `서버오류(${[...new Set(hardApi)].join(", ")})`,
    !r.denied && softApi.length && `API거절(${[...new Set(softApi)].join(", ")})`,
    screenErrors(r).length && `화면오류(${screenErrors(r).slice(0, 2).join(" | ")})`,
    r.denied && r.contentShown && "막혀야하는데내용보임",
    r.overflow && "가로넘침",
    !r.denied && r.role !== "visitor" && r.role !== "kiosk" && r.loginShown && "로그인풀림",
    r.textLeak?.length && `화면에새어나감(${r.textLeak.join(",")})`,
    r.apiLeak.length && `응답에새어나감(${r.apiLeak.join(", ")})`,
  ].filter(Boolean);
  r.flags = flags;
  if (flags.length) problems += 1;
  lines.push(`${flags.length ? "✗" : "✓"} [${r.role}/${r.size}] ${r.url}${r.denied ? " (막혀야 정상)" : ""}${flags.length ? "  → " + flags.join(" / ") : ""}`);
}
fs.writeFileSync(path.join(out, "pages.json"), JSON.stringify(results, null, 2));
console.log(lines.join("\n"));
console.log(`\n화면 ${results.length}개 중 문제 ${problems}개. 사진·기록: ${out}`);
process.exit(problems ? 1 : 0);
