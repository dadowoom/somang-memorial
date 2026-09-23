import fs from "fs";
import path from "path";
import type { AddressInfo } from "net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  const base = process.env.TMPDIR || process.env.TEMP || "/tmp";
  const uploadDir = `${base}/somang-media-test-${process.pid}`;
  process.env.UPLOAD_DIR = uploadDir;
  process.env.JWT_SECRET = "test-secret-for-media";
  return { uploadDir };
});

vi.mock("../db", () => ({
  canReadMemorial: vi.fn(),
  getAdminMemorialById: vi.fn(),
}));

import {
  mediaScope,
  mediaStem,
  parseUploadPath,
  SIGNED_MEDIA_BUCKET_SECONDS,
  signMediaUrl,
  verifySignedMedia,
} from "./protectedMedia";
import { createUploadAccessGate } from "./storageProxy";

const SECRET = "test-secret-for-media";
const NOW = Date.UTC(2026, 8, 23, 3, 0, 0);

function parseSigned(url: string) {
  const parsed = parseUploadPath(url.replace(/^\/uploads/, ""));
  if (!parsed || parsed.kind !== "signed") throw new Error("not signed");
  return parsed;
}

describe("기한이 적힌 사진 주소", () => {
  it("만든 주소는 기한 안에서만 맞다", () => {
    const url = signMediaUrl(
      "/uploads/family-rooms/5/abc_1234.jpg",
      NOW,
      SECRET
    );
    expect(url).toMatch(
      /^\/uploads\/s\/\d+\.[A-Za-z0-9_-]{32}\/family-rooms\/5\/abc_1234\.jpg$/
    );
    const parsed = parseSigned(url);
    expect(verifySignedMedia(parsed, NOW, SECRET)).toBe(true);
    // 받은 주소는 6~12시간 보인다.
    expect(parsed.exp * 1000 - NOW).toBeGreaterThanOrEqual(
      SIGNED_MEDIA_BUCKET_SECONDS * 1000
    );
    expect(verifySignedMedia(parsed, parsed.exp * 1000, SECRET)).toBe(false);
  });

  it("같은 시간대에는 주소가 같아서 브라우저 저장본을 다시 쓴다", () => {
    const a = signMediaUrl("/uploads/gallery/3/x_1.png", NOW, SECRET);
    const b = signMediaUrl("/uploads/gallery/3/x_1.png", NOW + 60_000, SECRET);
    expect(a).toBe(b);
  });

  it("작은 사진은 원본과 같은 서명으로 열린다", () => {
    const url = signMediaUrl("/uploads/gallery/3/x_1.png", NOW, SECRET);
    const thumb = parseSigned(url.replace(/\.png$/, ".thumb.jpg"));
    expect(mediaStem(thumb.key)).toBe("gallery/3/x_1");
    expect(verifySignedMedia(thumb, NOW, SECRET)).toBe(true);
  });

  it("다른 파일·다른 비밀값·고친 기한으로는 열리지 않는다", () => {
    const parsed = parseSigned(
      signMediaUrl("/uploads/family-rooms/5/abc_1234.jpg", NOW, SECRET)
    );
    expect(
      verifySignedMedia(
        { ...parsed, key: "family-rooms/6/abc_1234.jpg" },
        NOW,
        SECRET
      )
    ).toBe(false);
    expect(verifySignedMedia(parsed, NOW, "other-secret")).toBe(false);
    expect(
      verifySignedMedia({ ...parsed, exp: parsed.exp + 3600 }, NOW, SECRET)
    ).toBe(false);
  });

  it("바깥 주소와 이미 바꾼 주소는 그대로 둔다", () => {
    expect(signMediaUrl("https://img.youtube.com/a.jpg", NOW, SECRET)).toBe(
      "https://img.youtube.com/a.jpg"
    );
    const once = signMediaUrl("/uploads/family-rooms/1/a.jpg", NOW, SECRET);
    expect(signMediaUrl(once, NOW, SECRET)).toBe(once);
  });

  it("우회 주소도 실제로 열릴 파일 이름으로 읽는다", () => {
    expect(parseUploadPath("/%66amily-rooms/5/a.jpg")).toEqual({
      kind: "plain",
      key: "family-rooms/5/a.jpg",
    });
    expect(parseUploadPath("//./family-rooms/5/a.jpg")).toEqual({
      kind: "plain",
      key: "family-rooms/5/a.jpg",
    });
    expect(parseUploadPath("/gallery/../family-rooms/5/a.jpg")).toBeNull();
    expect(parseUploadPath("/family-rooms%5C5/a.jpg")).toBeNull();
    expect(parseUploadPath("/%E0%A4%A")).toBeNull();
  });

  it("보호 대상을 폴더로 가른다", () => {
    expect(mediaScope("family-rooms/5/a.jpg")).toEqual({ type: "family-room" });
    expect(mediaScope("gallery/12/a.jpg")).toEqual({
      type: "gallery",
      memorialId: 12,
    });
    // 관리자가 올린 사진첩 사진(추모관 번호 없음)과 키오스크 사진은 공개다.
    expect(mediaScope("gallery/abc.jpg")).toBeNull();
    expect(mediaScope("uploads/abc.jpg")).toBeNull();
    expect(mediaScope("kiosk-posters/abc.jpg")).toBeNull();
  });
});

describe("/uploads 문", () => {
  let baseUrl = "";
  let close: () => Promise<void> = async () => {};
  const publicMemorials = new Set([1]);
  const isMemorialPublic = vi.fn(async (id: number) => {
    if (id === 99) throw new Error("db down");
    return publicMemorials.has(id);
  });

  beforeAll(async () => {
    const files = [
      "family-rooms/5/abc_1234.jpg",
      "family-rooms/5/abc_1234.thumb.jpg",
      "gallery/1/pub_1.jpg",
      "gallery/2/priv_1.jpg",
      "gallery/99/x_1.jpg",
      "uploads/admin_1.jpg",
    ];
    for (const file of files) {
      const full = path.join(env.uploadDir, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, `photo:${file}`);
    }

    const app = express();
    app.use("/uploads", createUploadAccessGate({ isMemorialPublic }));
    app.use(
      "/uploads",
      express.static(env.uploadDir, {
        fallthrough: false,
        dotfiles: "deny",
        maxAge: "30d",
        immutable: true,
      })
    );
    const server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => new Promise(resolve => server.close(() => resolve()));
  });

  afterAll(async () => {
    await close();
    fs.rmSync(env.uploadDir, { recursive: true, force: true });
  });

  const get = (url: string) => fetch(`${baseUrl}${url}`);

  it("가족관 사진은 그냥 주소로는 막힌다 (우회 주소 포함)", async () => {
    for (const url of [
      "/uploads/family-rooms/5/abc_1234.jpg",
      "/uploads/family-rooms/5/abc_1234.thumb.jpg",
      "/uploads/%66amily-rooms/5/abc_1234.jpg",
      "/uploads//family-rooms/5/abc_1234.jpg",
      "/uploads/./family-rooms/5/abc_1234.jpg",
    ]) {
      const res = await get(url);
      expect(res.status, url).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("기한이 적힌 주소로는 가족관 사진과 작은 사진이 보인다", async () => {
    const url = signMediaUrl("/uploads/family-rooms/5/abc_1234.jpg");
    const res = await get(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("photo:family-rooms/5/abc_1234.jpg");
    expect(res.headers.get("cache-control")).toMatch(/^private, max-age=\d+$/);

    const thumb = await get(url.replace(/\.jpg$/, ".thumb.jpg"));
    expect(thumb.status).toBe(200);
    expect(await thumb.text()).toBe("photo:family-rooms/5/abc_1234.thumb.jpg");
  });

  it("서명이 틀리거나 다른 파일에 붙이면 막힌다", async () => {
    const url = signMediaUrl("/uploads/family-rooms/5/abc_1234.jpg");
    const forged = url.replace(/\.([A-Za-z0-9_-])/, (_m, c) =>
      c === "A" ? ".B" : ".A"
    );
    expect((await get(forged)).status).toBe(404);
    expect(
      (await get(url.replace("family-rooms/5/abc_1234", "gallery/2/priv_1")))
        .status
    ).toBe(404);
  });

  it("공개 추모관 사진과 관리자 사진은 지금처럼 보인다", async () => {
    const pub = await get("/uploads/gallery/1/pub_1.jpg");
    expect(pub.status).toBe(200);
    expect(pub.headers.get("cache-control")).toBe(
      "public, max-age=2592000, immutable"
    );
    expect((await get("/uploads/uploads/admin_1.jpg")).status).toBe(200);
  });

  it("비공개 추모관 사진은 그냥 주소로 막히고 기한 주소로 보인다", async () => {
    expect((await get("/uploads/gallery/2/priv_1.jpg")).status).toBe(404);
    const res = await get(signMediaUrl("/uploads/gallery/2/priv_1.jpg"));
    expect(res.status).toBe(200);
  });

  it("공개 여부를 확인하지 못하면 보여 주지 않는다", async () => {
    const res = await get("/uploads/gallery/99/x_1.jpg");
    expect(res.status).toBe(503);
  });
});
