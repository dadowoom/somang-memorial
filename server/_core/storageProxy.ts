import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { ENV } from "./env";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "../storage";
import {
  canReadMemorial,
  findBookMediaMemorialIds,
  getAdminMemorialById,
} from "../db";
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
  /** 추억책 사진이 쓰인 추모관 번호들 (2026-09-25). */
  bookMediaMemorialIds?: (key: string) => Promise<number[]>;
  now?: () => number;
};

/** 잠깐 기억하는 확인. 실패한 확인은 기억하지 않아 다음 요청이 다시 묻는다. */
function cachedCheck<K>(
  check: (key: K) => Promise<boolean>,
  now: () => number
) {
  const cache = new Map<K, { value: Promise<boolean>; at: number }>();
  return (key: K) => {
    const hit = cache.get(key);
    if (hit && now() - hit.at < MEMORIAL_PUBLIC_CACHE_MS) return hit.value;
    const value = check(key);
    cache.set(key, { value, at: now() });
    value.catch(() => cache.delete(key));
    if (cache.size > 1000) cache.clear();
    return value;
  };
}

/**
 * /uploads 앞에 서는 문 (2026-09-23, protectedMedia.ts 참고).
 *
 * - 기한이 적힌 주소: 서명과 기한이 맞으면 그 파일을 보여 준다. 브라우저에는
 *   기한까지만, 그 사람 브라우저에만 저장하게 한다.
 * - 그냥 주소: 가족관 사진과 비공개·작성 중 추모관 사진이면 "없음"으로 답한다.
 *   추억책 사진은 공개 추모관의 책에 쓰인 것만 보여 준다 (2026-09-25).
 *   나머지는 지금처럼 보여 준다.
 */
export function createUploadAccessGate(deps: UploadAccessGateDeps = {}) {
  const now = deps.now ?? Date.now;
  const isMemorialPublic = cachedCheck(
    deps.isMemorialPublic ?? isMemorialPublicFromDb,
    now
  );
  const bookMediaMemorialIds =
    deps.bookMediaMemorialIds ?? findBookMediaMemorialIds;
  // 어느 책에도 쓰이지 않은 사진은 공개로 보지 않는다. 공개 추모관의 책에
  // 하나라도 쓰였으면 이미 공개된 사진이다.
  const isBookMediaPublic = cachedCheck(async (key: string) => {
    for (const memorialId of await bookMediaMemorialIds(key)) {
      if (await isMemorialPublic(memorialId)) return true;
    }
    return false;
  }, now);

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
      const open =
        scope.type === "book"
          ? await isBookMediaPublic(parsed.key)
          : await isMemorialPublic(scope.memorialId);
      if (open) return next();
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
