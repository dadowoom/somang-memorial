import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { applySharePreview, buildSharePreview } from "./sharePreview";

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        // Vite gives JS/CSS assets content hashes. They can be reused safely
        // across normal deployments, while HTML must always point at the
        // latest asset list.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    // 추모관·부고장 주소는 공유 미리보기(og 태그)를 고인 정보로 바꿔 보낸다
    // (2026-09-21, sharePreview.ts). 무슨 일이 있어도 기본 화면은 나가야 하므로
    // 실패하면 원래 index.html 을 그대로 보낸다.
    try {
      const preview = await buildSharePreview(req.originalUrl.split("?")[0]);
      if (preview) {
        const html = await fs.promises.readFile(indexPath, "utf-8");
        res.type("html").send(applySharePreview(html, preview));
        return;
      }
    } catch (error) {
      console.warn("[SharePreview] 미리보기를 만들지 못했습니다", error);
    }
    res.sendFile(indexPath);
  });
}
