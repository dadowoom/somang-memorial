import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicMemorialBySlug: vi.fn(),
  listMemorialGalleryPhotos: vi.fn(),
}));
vi.mock("../db", () => mocks);

import {
  applySharePreview,
  buildSharePreview,
  parseMemorialPath,
} from "./sharePreview";

const indexHtml = fs.readFileSync(
  path.resolve(__dirname, "../../client/index.html"),
  "utf-8"
);

const memorial = {
  id: 2,
  slug: "kim-somang-kwonsa",
  name: "김소망",
  role: "권사",
  birthDate: "1933-04-12",
  deathDate: "2026-05-22",
  summary: "평생 기도로 가정을 지킨 어머니",
  servicePlace: "소망교회 본당",
  serviceTime: "2026-05-24T10:00",
  status: "published",
  visibility: "public",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublicMemorialBySlug.mockResolvedValue(memorial);
  mocks.listMemorialGalleryPhotos.mockResolvedValue([
    { photoUrl: "/uploads/gallery/2/a.jpg", isRepresentative: 0 },
    { photoUrl: "/uploads/gallery/2/portrait.jpg", isRepresentative: 1 },
  ]);
});

describe("추모관 주소 알아보기", () => {
  it("추모관·기록관·부고장 주소만 알아본다", () => {
    expect(parseMemorialPath("/memorial/kim")).toEqual({ slug: "kim", page: "memorial" });
    expect(parseMemorialPath("/memorial/kim/obituary")).toEqual({ slug: "kim", page: "obituary" });
    expect(parseMemorialPath("/memorial/kim/archive/")).toEqual({ slug: "kim", page: "archive" });
    expect(parseMemorialPath("/memorial/%EA%B9%80")).toEqual({ slug: "김", page: "memorial" });
    expect(parseMemorialPath("/memorial/create")).toBeNull();
    expect(parseMemorialPath("/memorial/search")).toBeNull();
    expect(parseMemorialPath("/memorial/kim/family")).toBeNull();
    expect(parseMemorialPath("/admin")).toBeNull();
  });
});

describe("공유 미리보기", () => {
  it("부고장은 고인 성함과 빈소·예배 일시, 대표 사진으로 보인다", async () => {
    const preview = await buildSharePreview("/memorial/kim-somang-kwonsa/obituary");
    expect(preview?.title).toBe("[부고] 故 김소망 권사님께서 소천하셨습니다");
    expect(preview?.description).toContain("빈소 소망교회 본당");
    expect(preview?.description).toContain("2026-05-24 10:00");
    expect(preview?.image).toBe(
      "https://somangmemorial.co.kr/uploads/gallery/2/portrait.jpg"
    );
  });

  it("추모관은 성함과 한 줄 소개로 보인다", async () => {
    const preview = await buildSharePreview("/memorial/kim-somang-kwonsa");
    expect(preview?.title).toBe("김소망 권사 추모관 | 소망이 있는 곳");
    expect(preview?.description).toBe("평생 기도로 가정을 지킨 어머니");
  });

  it("비공개·작성 중·없는 추모관은 기본 미리보기를 그대로 둔다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValueOnce({ ...memorial, visibility: "private" });
    expect(await buildSharePreview("/memorial/kim-somang-kwonsa")).toBeNull();
    mocks.getPublicMemorialBySlug.mockResolvedValueOnce({ ...memorial, status: "pending" });
    expect(await buildSharePreview("/memorial/kim-somang-kwonsa")).toBeNull();
    mocks.getPublicMemorialBySlug.mockResolvedValueOnce(null);
    expect(await buildSharePreview("/memorial/nobody")).toBeNull();
    expect(mocks.listMemorialGalleryPhotos).not.toHaveBeenCalled();
  });

  it("index.html 의 제목과 og 태그를 바꾸고, 따옴표·꺾쇠는 안전하게 적는다", async () => {
    mocks.getPublicMemorialBySlug.mockResolvedValueOnce({
      ...memorial,
      summary: '"기도"의 사람 <script>',
    });
    const preview = await buildSharePreview("/memorial/kim-somang-kwonsa");
    const html = applySharePreview(indexHtml, preview!);
    expect(html).toContain("<title>김소망 권사 추모관 | 소망이 있는 곳</title>");
    expect(html).toContain('<meta property="og:title" content="김소망 권사 추모관 | 소망이 있는 곳"');
    expect(html).toContain(
      '<meta property="og:image" content="https://somangmemorial.co.kr/uploads/gallery/2/portrait.jpg"'
    );
    expect(html).toContain("&quot;기도&quot;의 사람 &lt;script&gt;");
    expect(html).not.toContain("<script>\"");
    expect(html).not.toContain('og:image:width');
    expect(html).toContain('<div id="root"></div>');
  });

  it("사진이 없으면 기본 이미지를 그대로 쓴다", async () => {
    mocks.listMemorialGalleryPhotos.mockResolvedValueOnce([]);
    const preview = await buildSharePreview("/memorial/kim-somang-kwonsa");
    const html = applySharePreview(indexHtml, preview!);
    expect(html).toContain("og-somang-v1.png");
  });
});
