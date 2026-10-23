import compression from "compression";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../_core/oauth";
import { registerStorageProxy } from "../_core/storageProxy";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { isDatabaseHealthy } from "../db";
import { validateRuntimeConfig } from "../_core/runtimeConfig";
import {
  registerCspReportRoute,
  registerSecurityHeaders,
} from "../_core/securityHeaders";
import {
  logTrpcError,
  registerErrorHandler,
  registerRequestLogging,
} from "../_core/requestLogging";
import { serveStatic } from "../_core/serveStatic";
import { previewHealthStatus } from "./workflow";

async function startPreviewServer() {
  validateRuntimeConfig(process.env);
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  let ready = false;
  registerSecurityHeaders(app);
  registerRequestLogging(app);
  app.use(compression());
  registerCspReportRoute(app);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));
  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res
      .status(previewHealthStatus(ready))
      .json({ status: ready ? "ready" : "not_ready" });
  });
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
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type }) {
        logTrpcError({ code: error.code, path, type, error });
      },
    })
  );
  serveStatic(app);
  registerErrorHandler(app);
  server.listen(3000, "0.0.0.0", () => {
    ready = true;
    console.log("[작업장] 서버 준비 완료");
  });
}

startPreviewServer().catch(() => {
  console.error("[작업장] 서버 기동 실패");
  process.exit(1);
});
