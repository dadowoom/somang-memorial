import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startReminderNotificationScheduler } from "./reminderScheduler";
import { startLetterNoticeScheduler } from "./letterNoticeScheduler";
import { startUploadCleanupScheduler } from "./uploadCleanup";
import { isDatabaseHealthy } from "../db";
import { validateRuntimeConfig } from "./runtimeConfig";
import {
  registerCspReportRoute,
  registerSecurityHeaders,
} from "./securityHeaders";
import {
  logTrpcError,
  redactQueryParams,
  registerErrorHandler,
  registerRequestLogging,
} from "./requestLogging";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateRuntimeConfig(process.env);
  const app = express();
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }
  const server = createServer(app);
  registerSecurityHeaders(app);
  // 기록이 먼저다. 압축 단계에서 문제가 생겨도 그 요청이 로그에 남는다.
  registerRequestLogging(app);
  // Compress text responses (HTML, JS, CSS, JSON). Already-compressed images
  // are skipped by the middleware's default content-type filter.
  app.use(compression());
  // 보안 정책 어긋남 알림 (application/csp-report). 아래 express.json 보다 먼저.
  registerCspReportRoute(app);
  // 20MB is the largest permitted source image; base64 encoding needs a
  // little additional room without allowing arbitrary 50MB request bodies.
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok" });
  });
  app.get("/readyz", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const databaseReady = await isDatabaseHealthy();
    res.status(databaseReady ? 200 : 503).json({
      status: databaseReady ? "ready" : "not_ready",
      database: databaseReady ? "ok" : "unavailable",
    });
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // 절차 안에서 난 서버 쪽 오류(DB 실패 등)를 기록한다. 입력값은 남기지 않는다.
      onError({ error, path, type }) {
        logTrpcError({ code: error.code, path, type, error });
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Registered last so it catches errors that bubble up from any route above.
  registerErrorHandler(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  startReminderNotificationScheduler();
  startLetterNoticeScheduler();
  startUploadCleanupScheduler();
}

// 기동에 실패하면 0 이 아닌 코드로 끝나야 pm2 가 "죽었다"고 보고 다시 띄운다.
// 전에는 console.error 만 하고 조용히 끝나서 정상 종료처럼 보였다 (2026-09-14).
// 처리되지 않은 오류도 같은 이유로 기록을 남기고 바로 끝낸다. Node 는 원래
// 이런 오류에 프로세스를 끝내지만, 어디서 났는지 로그에 남기려고 명시한다.
// DB 오류에는 넣은 값(개인정보)이 붙어 나오므로 가리고 남긴다 (2026-09-23).
const fatalDescription = (error: unknown) => {
  if (!(error instanceof Error)) return redactQueryParams(String(error));
  // 오류가 난 자리(스택의 "at ..." 줄)만 남기고, 문구는 값을 가린다.
  const frames = (error.stack ?? "")
    .split("\n")
    .filter(line => line.trim().startsWith("at "));
  return [redactQueryParams(error.message), ...frames].join("\n");
};
process.on("unhandledRejection", reason => {
  console.error("[fatal] 처리되지 않은 비동기 오류", fatalDescription(reason));
  process.exit(1);
});
process.on("uncaughtException", error => {
  console.error("[fatal] 처리되지 않은 오류", fatalDescription(error));
  process.exit(1);
});

startServer().catch(error => {
  console.error("[fatal] 서버 기동 실패", error);
  process.exit(1);
});
