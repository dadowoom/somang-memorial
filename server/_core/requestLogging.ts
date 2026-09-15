import type { Express, NextFunction, Request, Response } from "express";
import { STATUS_CODES } from "http";

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

export type ErrorResponsePlan = {
  /** HTTP status to answer with. */
  status: number;
  /** Generic text for the client. Never the internal error message. */
  body: string;
  /** 4xx is the client's fault and goes to the warn log; 5xx is ours. */
  level: "warn" | "error";
};

/**
 * Express and its middleware attach a `status` (or `statusCode`) to errors
 * they already classified: `express.static` with `fallthrough: false` throws
 * a 404 for a missing file, `express.json` throws 400 for broken JSON and 413
 * for an oversized body, `send` throws 403 for `..` in the path.
 *
 * Before 2026-09-15 every one of those became a 500 "Internal Server Error"
 * and an `[error]` log line, so a missing photo looked like a server crash
 * and scanners probing `/uploads/.env` filled the error log.
 */
export function planErrorResponse(error: unknown): ErrorResponsePlan {
  const candidate =
    error && typeof error === "object"
      ? ((error as { status?: unknown }).status ??
        (error as { statusCode?: unknown }).statusCode)
      : undefined;
  const status =
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 599
      ? candidate
      : 500;
  return {
    status,
    body: STATUS_CODES[status] ?? "Internal Server Error",
    level: status < 500 ? "warn" : "error",
  };
}

/**
 * Central error handler. Logs the failure with request context (never the body)
 * and returns a generic message so internal details and stack traces are not
 * exposed to the client. Registered after all routes.
 */
export function registerErrorHandler(app: Express) {
  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    const plan = planErrorResponse(error);
    const line = JSON.stringify({
      t: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: plan.status,
      message,
    });
    if (plan.level === "error") {
      console.error(`[error] ${line}`);
    } else {
      console.warn(`[warn] ${line}`);
    }

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(plan.status).json({ error: plan.body });
  });
}

/**
 * tRPC error codes that are the caller's doing (wrong password, missing room,
 * rate limit, validation). They already reach the client as a proper answer
 * and would only be noise in the server log.
 */
const EXPECTED_TRPC_ERROR_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "TOO_MANY_REQUESTS",
  "UNPROCESSABLE_CONTENT",
]);

/**
 * Whether a tRPC procedure failure deserves an `[error]` log line.
 *
 * Until 2026-09-15 no `onError` hook was registered, so a DB failure or a
 * bug inside a procedure was answered to the browser as INTERNAL_SERVER_ERROR
 * and never appeared in the server log at all.
 */
export function shouldLogTrpcError(code: string) {
  return !EXPECTED_TRPC_ERROR_CODES.has(code);
}

export function logTrpcError(input: {
  code: string;
  path: string | undefined;
  type: string;
  error: unknown;
}) {
  if (!shouldLogTrpcError(input.code)) return;
  const error = input.error;
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error &&
    error.cause instanceof Error &&
    error.cause.message !== message
      ? error.cause.message
      : undefined;
  console.error(
    `[trpc] ${JSON.stringify({
      t: new Date().toISOString(),
      path: input.path ?? "unknown",
      type: input.type,
      code: input.code,
      message,
      ...(cause ? { cause } : {}),
    })}`
  );
}
