import type { Express, Request } from "express";

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
