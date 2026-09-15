import type { Express, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  if (process.env.TRUST_PROXY !== "true") return false;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const values = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto?.split(",") ?? [];

  return values.some(value => value.trim().toLowerCase() === "https");
}

/**
 * Headers that are safe for the public site and kiosk.  A full CSP will be
 * introduced with the HTTPS reverse proxy because media embeds need their
 * final production domains listed explicitly.
 */
export function registerSecurityHeaders(app: Express) {
  app.disable("x-powered-by");

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
