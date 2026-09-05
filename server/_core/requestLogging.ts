import type { Express, NextFunction, Request, Response } from "express";

// Endpoints that external monitors poll frequently. They are skipped so the
// access log is not drowned out by health checks.
const SKIP_LOG_PATHS = new Set(["/healthz", "/readyz"]);

/**
 * One structured line per request: time, method, path, status, duration, IP.
 *
 * Only the path (without query string) is logged, never the request body or
 * query input, so passwords, session cookies, and access tokens never reach
 * the log. This gives basic traffic visibility and after-the-fact tracing
 * without recording sensitive data.
 */
export function registerRequestLogging(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (SKIP_LOG_PATHS.has(req.path)) {
      next();
      return;
    }

    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const entry = {
        t: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: durationMs,
        ip: req.ip ?? "unknown",
      };
      console.log(`[request] ${JSON.stringify(entry)}`);
    });

    next();
  });
}

/**
 * Central error handler. Logs the failure with request context (never the body)
 * and returns a generic message so internal details and stack traces are not
 * exposed to the client. Registered after all routes.
 */
export function registerErrorHandler(app: Express) {
  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[error] ${JSON.stringify({
        t: new Date().toISOString(),
        method: req.method,
        path: req.path,
        message,
      })}`
    );

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).json({ error: "Internal Server Error" });
  });
}
