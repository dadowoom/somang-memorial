import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalPublicSiteUrl = process.env.PUBLIC_SITE_URL;

async function loadWith(publicSiteUrl: string | undefined) {
  if (publicSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = publicSiteUrl;

  vi.resetModules();
  return import("./siteUrl");
}

describe("siteUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalPublicSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
    else process.env.PUBLIC_SITE_URL = originalPublicSiteUrl;
    vi.resetModules();
  });

  it("설정한 주소를 쓴다", async () => {
    const { buildMemorialUrl } = await loadWith("https://somangmemorial.co.kr");
    expect(buildMemorialUrl("kim-somang")).toBe(
      "https://somangmemorial.co.kr/memorial/kim-somang"
    );
  });

  it("끝에 붙은 빗금을 지운다", async () => {
    const { buildMemorialUrl } = await loadWith("https://somangmemorial.co.kr/");
    expect(buildMemorialUrl("kim-somang")).toBe(
      "https://somangmemorial.co.kr/memorial/kim-somang"
    );
  });

  it("설정이 비어 있어도 IP 가 아니라 도메인이 나간다", async () => {
    // 이 주소는 유가족 휴대폰에 그대로 찍힌다. 낯선 IP 가 보이면 열지 않는다.
    const { buildMemorialUrl } = await loadWith("");
    expect(buildMemorialUrl("kim-somang")).toBe(
      "https://somangmemorial.co.kr/memorial/kim-somang"
    );
  });

  it("공백만 있어도 도메인으로 되돌린다", async () => {
    const { buildMemorialUrl } = await loadWith("   ");
    expect(buildMemorialUrl("kim-somang")).toBe(
      "https://somangmemorial.co.kr/memorial/kim-somang"
    );
  });

  it("부고장 주소도 만든다", async () => {
    const { buildObituaryUrl } = await loadWith("https://somangmemorial.co.kr");
    expect(buildObituaryUrl("kim-somang")).toBe(
      "https://somangmemorial.co.kr/memorial/kim-somang/obituary"
    );
  });
});
