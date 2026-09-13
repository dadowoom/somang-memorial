import { ENV } from "./env";

/**
 * 문자·메일에 넣을 사이트 주소를 만듭니다.
 *
 * 여기서 만든 주소는 유가족과 조문객의 휴대폰에 그대로 찍힙니다.
 * 낯선 주소가 보이면 스미싱으로 여기고 열지 않으므로, 사람이 알아볼 수 있는
 * 도메인이어야 합니다.
 *
 * 운영에서는 `.env` 의 `PUBLIC_SITE_URL` 을 씁니다. 그 값이 비어 있어도
 * 문자가 나가는 것을 막을 수는 없으니, 마지막 수단으로 실제 도메인을 둡니다.
 */
const FALLBACK_SITE_URL = "https://somangmemorial.co.kr";

export function getSiteUrl() {
  const configured = ENV.publicSiteUrl.trim();
  return (configured || FALLBACK_SITE_URL).replace(/\/+$/, "");
}

export function buildMemorialUrl(slug: string) {
  return `${getSiteUrl()}/memorial/${slug}`;
}

export function buildObituaryUrl(slug: string) {
  return `${getSiteUrl()}/memorial/${slug}/obituary`;
}
