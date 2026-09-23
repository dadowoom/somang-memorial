import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { ENV } from "./env";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "../storage";
import { canReadMemorial, getAdminMemorialById } from "../db";
import {
  mediaScope,
  parseUploadPath,
  verifySignedMedia,
} from "./protectedMedia";

/** 추모관 공개 여부를 사진마다 DB 에 묻지 않도록 잠깐 기억한다. */
const MEMORIAL_PUBLIC_CACHE_MS = 30 * 1000;

async function isMemorialPublicFromDb(memorialId: number) {
  const memorial = await getAdminMemorialById(memorialId);
  // 없는(지운) 추모관의 사진은 공개로 보지 않는다.
  return memorial !== null && canReadMemorial(memorial, null);
}

type UploadAccessGateDeps = {
  isMemorialPublic?: (memorialId: number) => Promise<boolean>;
  now?: () => number;
};

/**
 * /uploads 앞에 서는 문 (2026-09-23, protectedMedia.ts 참고).
 *
 * - 기한이 적힌 주소: 서명과 기한이 맞으면 그 파일을 보여 준다. 브라우저에는
 *   기한까지만, 그 사람 브라우저에만 저장하게 한다.
 * - 그냥 주소: 가족관 사진과 비공개·작성 중 추모관 사진이면 "없음"으로 답한다.
 *   나머지는 지금처럼 보여 준다.
 */
export function createUploadAccessGate(deps: UploadAccessGateDeps = {}) {
  const isMemorialPublicUncached =
    deps.isMemorialPublic ?? isMemorialPublicFromDb;
  const now = deps.now ?? Date.now;
  const cache = new Map<number, { value: Promise<boolean>; at: number }>();

  const isMemorialPublic = (memorialId: number) => {
    const hit = cache.get(memorialId);
    if (hit && now() - hit.at < MEMORIAL_PUBLIC_CACHE_MS) return hit.value;
    const value = isMemorialPublicUncached(memorialId);
    cache.set(memorialId, { value, at: now() });
    // 실패한 확인은 기억하지 않는다. 다음 요청이 다시 묻는다.
    value.catch(() => cache.delete(memorialId));
    if (cache.size > 1000) cache.clear();
    return value;
  };

  const notFound = (res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).end();
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const parsed = parseUploadPath(req.path);
    if (!parsed) return notFound(res);

    if (parsed.kind === "signed") {
      if (!verifySignedMedia(parsed, now())) return notFound(res);
      const maxAge = Math.max(0, Math.floor(parsed.exp - now() / 1000));
      res.locals.signedMediaCacheControl = `private, max-age=${maxAge}`;
      const query = req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";
      req.url = `/${parsed.key.split("/").map(encodeURIComponent).join("/")}${query}`;
      return serveSigned(req, res, next);
    }

    const scope = mediaScope(parsed.key);
    if (!scope) return next();
    if (scope.type === "family-room") return notFound(res);

    try {
      if (await isMemorialPublic(scope.memorialId)) return next();
    } catch (error) {
      console.error("[Uploads] 추모관 공개 여부 확인 실패", error);
      res.setHeader("Cache-Control", "no-store");
      res.status(503).end();
      return;
    }
    return notFound(res);
  };
}

const serveSigned = express.static(UPLOAD_DIR, {
  fallthrough: false,
  dotfiles: "deny",
  cacheControl: false,
  setHeaders(res) {
    const value = (res as Response).locals?.signedMediaCacheControl;
    if (typeof value === "string") res.setHeader("Cache-Control", value);
  },
});

export function registerStorageProxy(app: Express) {
  app.use(UPLOAD_URL_PREFIX, createUploadAccessGate());
  app.use(
    UPLOAD_URL_PREFIX,
    express.static(UPLOAD_DIR, {
      fallthrough: false,
      // 휴지통(.trash)처럼 점으로 시작하는 것은 절대 내보내지 않는다.
      dotfiles: "deny",
      maxAge: "30d",
      immutable: true,
    })
  );

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as unknown as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(404).send("Storage object not found");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(
          `[StorageProxy] forge error: ${forgeResp.status} ${body}`
        );
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
