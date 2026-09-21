import { getPublicMemorialBySlug, listMemorialGalleryPhotos } from "../db";
import { buildMemorialUrl, buildObituaryUrl, getSiteUrl } from "./siteUrl";

/**
 * 카카오톡·문자로 공유한 링크의 미리보기 (2026-09-21).
 *
 * 화면은 브라우저에서 그리는 방식이라, 서버는 어떤 주소든 똑같은 index.html 을
 * 돌려주었다. 그래서 부고장을 보내도 받는 사람에게는 고인 성함·사진 없이
 * "소망이 있는 곳"만 보였다. 카카오톡은 자바스크립트를 실행하지 않고 HTML 의
 * og 태그만 읽으므로, 추모관 주소로 온 요청에만 서버가 그 태그를 고인 정보로
 * 바꿔 넣는다.
 *
 * 공개로 게시된 추모관만 바꾼다. 비공개·작성 중·없는 추모관은 기본 미리보기를
 * 그대로 둔다 — 비공개 추모관의 성함이나 사진이 미리보기로 새어 나가면 안 된다.
 */

export type SharePreview = {
  title: string;
  description: string;
  url: string;
  image: string | null;
  imageAlt: string;
};

const MEMORIAL_PATH = /^\/memorial\/([^/?#]+)(\/(archive|obituary))?\/?$/;
/** /memorial/ 아래지만 추모관이 아닌 화면 */
const RESERVED_SLUGS = new Set(["create", "search"]);

export function parseMemorialPath(pathname: string) {
  const match = MEMORIAL_PATH.exec(pathname);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!slug || RESERVED_SLUGS.has(slug) || slug.length > 120) return null;
  const page = (match[3] ?? "memorial") as "memorial" | "archive" | "obituary";
  return { slug, page };
}

function year(value: string | null | undefined) {
  const found = /^(\d{4})/.exec((value ?? "").trim());
  return found ? found[1] : "";
}

function lifespan(birth: string | null | undefined, death: string | null | undefined) {
  const b = year(birth);
  const d = year(death);
  if (b && d) return `${b} – ${d}`;
  return b || d;
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${getSiteUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

function oneLine(text: string | null | undefined, max = 110) {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export async function buildSharePreview(
  pathname: string
): Promise<SharePreview | null> {
  const parsed = parseMemorialPath(pathname);
  if (!parsed) return null;

  const memorial = await getPublicMemorialBySlug(parsed.slug);
  if (
    !memorial ||
    memorial.status !== "published" ||
    memorial.visibility !== "public"
  ) {
    return null;
  }

  const photos = await listMemorialGalleryPhotos(memorial.id);
  const portrait =
    photos.find(photo => photo.isRepresentative === 1) ?? photos[0] ?? null;
  const person = `${memorial.name} ${memorial.role}`.trim();
  const years = lifespan(memorial.birthDate, memorial.deathDate);

  if (parsed.page === "obituary") {
    const service = [
      memorial.servicePlace ? `빈소 ${oneLine(memorial.servicePlace, 40)}` : "",
      memorial.serviceTime
        ? `예배 ${oneLine(memorial.serviceTime.replace("T", " "), 30)}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: `[부고] 故 ${person}님께서 소천하셨습니다`,
      description:
        service ||
        `${years ? `${years} · ` : ""}삼가 고인의 명복을 빕니다. 부고장에서 빈소와 일정을 확인하실 수 있습니다.`,
      url: buildObituaryUrl(memorial.slug),
      image: portrait ? absoluteUrl(portrait.photoUrl) : null,
      imageAlt: `故 ${person}`,
    };
  }

  return {
    title: `${person} 추모관 | 소망이 있는 곳`,
    description:
      oneLine(memorial.summary) ||
      `${years ? `${years} · ` : ""}고인의 삶과 믿음을 기억하는 소망교회 추모관입니다.`,
    url:
      parsed.page === "archive"
        ? `${buildMemorialUrl(memorial.slug)}/archive`
        : buildMemorialUrl(memorial.slug),
    image: portrait ? absoluteUrl(portrait.photoUrl) : null,
    imageAlt: person,
  };
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setMeta(html: string, attr: "property" | "name", key: string, value: string) {
  const pattern = new RegExp(
    `(<meta\\s+${attr}="${key.replace(/[.:]/g, "\\$&")}"\\s+content=")[^"]*(")`
  );
  return html.replace(pattern, `$1${escapeAttr(value)}$2`);
}

/** index.html 의 제목·설명·og 태그를 미리보기 내용으로 바꾼다. */
export function applySharePreview(html: string, preview: SharePreview) {
  let out = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeAttr(preview.title)}</title>`
  );
  // index.html 은 content 를 다음 줄에 쓰기도 해서, 먼저 한 줄로 모은다.
  out = out.replace(/<meta\s+(property|name)="([^"]+)"\s+content="/g, '<meta $1="$2" content="');
  out = setMeta(out, "name", "description", preview.description);
  out = setMeta(out, "property", "og:type", "article");
  out = setMeta(out, "property", "og:title", preview.title);
  out = setMeta(out, "property", "og:description", preview.description);
  out = setMeta(out, "property", "og:url", preview.url);
  out = setMeta(out, "name", "twitter:title", preview.title);
  out = setMeta(out, "name", "twitter:description", preview.description);
  if (preview.image) {
    out = setMeta(out, "property", "og:image", preview.image);
    out = setMeta(out, "property", "og:image:alt", preview.imageAlt);
    out = setMeta(out, "name", "twitter:image", preview.image);
    // 기본 이미지의 가로세로(1200x630)는 고인 사진과 맞지 않으므로 뺀다.
    out = out
      .replace(/\s*<meta property="og:image:width"[^>]*>/, "")
      .replace(/\s*<meta property="og:image:height"[^>]*>/, "");
  }
  return out;
}
