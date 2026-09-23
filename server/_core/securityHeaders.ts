import type { Express, Request } from "express";
import express from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  if (process.env.TRUST_PROXY !== "true") return false;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const values = Array.isArray(forwardedProto)
    ? forwardedProto
    : (forwardedProto?.split(",") ?? []);

  return values.some(value => value.trim().toLowerCase() === "https");
}

/**
 * 콘텐츠 보안 정책(CSP, 2026-09-23 계획서 L-6). 화면이 불러와도 되는 곳을 적어,
 * 누가 글에 몰래 스크립트를 끼워 넣어도 브라우저가 실행하지 않게 한다.
 *
 * 허락한 바깥 주소:
 * - 구글 글꼴 (fonts.googleapis.com 글꼴 목록, fonts.gstatic.com 글꼴 파일)
 * - 유튜브 영상 틀 (youtube.com, youtube-nocookie.com)
 * - 사진은 https 주소면 어디든 (유튜브·비메오 썸네일, 옛 틀 저장소 사진이 DB 에 남아
 *   있을 수 있다). 사진은 스크립트를 실행하지 못하므로 넓게 둔다.
 *
 * 스타일은 화면 부품(알림창 등)이 <style> 을 직접 넣으므로 'unsafe-inline' 을 둔다.
 * 스크립트는 우리 사이트 것만 허락한다 (운영 index.html 에 인라인 스크립트 없음).
 */
/** 브라우저가 어긋난 것을 알려 오는 곳 (2026-09-23). */
export const CSP_REPORT_PATH = "/api/csp-report";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `report-uri ${CSP_REPORT_PATH}`,
].join("; ");

export type CspMode = "off" | "report-only" | "enforce";

/**
 * 처음에는 "기록만"(report-only)으로 내보낸다. 어긋나는 것이 있어도 막지 않고
 * 브라우저 개발자 도구에만 알린다. 운영 화면에서 어긋나는 것이 없는지 확인한 뒤
 * enforce 로 바꾼다. 개발 서버(Vite)는 인라인 스크립트를 쓰므로 끈다.
 */
export function cspMode(env: NodeJS.ProcessEnv = process.env): CspMode {
  const value = env.CSP_MODE;
  if (value === "off" || value === "report-only" || value === "enforce") {
    return value;
  }
  return env.NODE_ENV === "production" ? "report-only" : "off";
}

/**
 * Headers that are safe for the public site and kiosk. The CSP above is sent on
 * page and file responses (not /api JSON).
 */
export function registerSecurityHeaders(app: Express) {
  app.disable("x-powered-by");
  const mode = cspMode();
  const cspHeader =
    mode === "enforce"
      ? "Content-Security-Policy"
      : mode === "report-only"
        ? "Content-Security-Policy-Report-Only"
        : null;

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );

    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
    } else if (cspHeader) {
      res.setHeader(cspHeader, CONTENT_SECURITY_POLICY);
    }

    // HSTS is emitted only on HTTPS so the current HTTP endpoint does not
    // accidentally pin an insecure origin in a visitor's browser.
    // includeSubDomains 는 쓰지 않는다. 메일 웹화면(w.somangmemorial.co.kr)처럼
    // 예스닉 서버에 얹힌 하위 주소는 우리 인증서가 없어서, 하위 주소까지 HTTPS 를
    // 강제하면 브라우저가 그 주소를 아예 열지 못한다 (2026-09-15).
    if (isSecureRequest(req)) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }

    next();
  });
}

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[^ -~]/g, "?").slice(0, max);
}

/**
 * 브라우저가 보낸 어긋남 알림에서 서버 기록에 남길 것만 뽑는다. 주소의 ? 뒤
 * (비밀번호 재설정 열쇠 등)와 # 뒤는 버린다. 추모관 주소(성함)와 초대 주소(초대
 * 열쇠)의 그 칸은 * 로 가린다. 어느 화면인지만 알면 된다.
 */
export function summarizeCspReport(body: unknown) {
  const report =
    body && typeof body === "object" && "csp-report" in body
      ? (body as Record<string, unknown>)["csp-report"]
      : null;
  if (!report || typeof report !== "object") return null;
  const data = report as Record<string, unknown>;
  const directive = clean(
    data["effective-directive"] || data["violated-directive"],
    40
  ).split(" ")[0];
  if (!directive) return null;

  const withoutQuery = (value: unknown) => {
    const text = typeof value === "string" ? value : "";
    try {
      const url = new URL(text);
      return `${url.origin}${url.pathname}`;
    } catch {
      return text.split(/[?#]/)[0];
    }
  };
  let page = withoutQuery(data["document-uri"]);
  try {
    page = new URL(page).pathname;
  } catch {
    // 주소가 아니면 그대로 (앞에서 ? 뒤는 버렸다)
  }
  const MASK_AFTER = new Set(["memorial", "memorials", "invite"]);
  page = page
    .split("/")
    .map((segment, index, all) =>
      segment &&
      (segment.includes("%") ||
        /[^ -~]/.test(segment) ||
        (MASK_AFTER.has(all[index - 1]) &&
          !["create", "search"].includes(segment)))
        ? "*"
        : segment
    )
    .join("/");
  return {
    directive,
    blocked: clean(withoutQuery(data["blocked-uri"]), 100) || "(없음)",
    page: clean(page, 100),
  };
}

const CSP_REPORT_LOG_LIMIT_PER_HOUR = 100;

/**
 * 어긋남 알림을 받아 서버 기록(pm2 로그)에 한 줄씩 남긴다. 로그인해야 들어가는
 * 화면(수정·관리자)은 운영자가 직접 열어 볼 수 없으므로, 실제로 쓰는 동안
 * 어긋나는 것이 있는지 여기서 본다. 한 시간에 100줄까지만 남긴다.
 * express.json 보다 먼저 등록한다 (알림은 application/csp-report 로 온다).
 */
export function registerCspReportRoute(app: Express) {
  let windowStart = Date.now();
  let logged = 0;
  app.post(
    CSP_REPORT_PATH,
    express.json({
      limit: "16kb",
      type: ["application/csp-report", "application/json"],
    }),
    (req, res) => {
      const summary = summarizeCspReport(req.body);
      if (Date.now() - windowStart > 60 * 60 * 1000) {
        windowStart = Date.now();
        logged = 0;
      }
      if (summary && logged < CSP_REPORT_LOG_LIMIT_PER_HOUR) {
        logged += 1;
        console.warn(
          `[CSP] ${summary.directive} blocked=${summary.blocked} page=${summary.page}`
        );
      }
      res.status(204).end();
    }
  );
}
