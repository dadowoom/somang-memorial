/**
 * 키오스크 검색 화면 오른쪽 아래(5시 방향)의 동그라미 단추 두 개 (2026-09-16).
 *
 * - 예시 보기: 추모관이 어떤 모습인지 미리 보여 주는 견본 추모관으로 간다.
 * - 이용 안내: 홈페이지 이용 안내 본문(GuideContent)을 화면 가득 보여 준다.
 */

/** 견본으로 보여 줄 추모관. 다른 추모관으로 바꾸려면 이 값만 고친다. */
export const KIOSK_SAMPLE_MEMORIAL_SLUG = "kim-somang-kwonsa";

export function kioskSampleMemorialPath() {
  return `/kiosk/memorial/${KIOSK_SAMPLE_MEMORIAL_SLUG}`;
}

/**
 * 이용 안내 창의 QR 코드가 여는 주소 (2026-09-16 현장 요청). 조문객이 휴대폰으로
 * 찍으면 홈페이지 첫 화면이 열리고, 거기서 로그인해 추모관을 직접 만들 수 있다.
 * 키오스크 화면(/kiosk)이 아니라 일반 홈페이지로 보낸다.
 */
export function kioskGuideQrUrl(origin: string) {
  return `${origin.replace(/\/+$/, "")}/?from=kiosk`;
}
