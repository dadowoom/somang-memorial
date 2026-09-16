/**
 * 책장 읽기 창(팝업)의 책 크기 (2026-09-16).
 *
 * 전에는 책이 페이지 본문 안에 그려져 위아래로 스크롤하다 보면 책 절반이
 * 잘려 보였다. 이제 "책 펼쳐보기"를 누르면 화면 전체를 덮는 창이 뜨고,
 * 그 안에서 책을 넘긴다. 책은 창 높이에 맞춰 최대한 크게, 그러나 가로가
 * 화면을 넘지 않게 잡는다.
 */

/** 위 제목줄과 아래 단추줄이 차지하는 높이(px). 책은 그 나머지에 들어간다. */
export const BOOK_READER_CHROME_PX = 176;

/** 한 쪽의 가로÷세로 비율. 펼침(PC)은 두 쪽이라 가로가 두 배다. */
export const DESKTOP_PAGE_RATIO = 560 / 720;
export const MOBILE_PAGE_RATIO = 340 / 500;

export function bookReaderFrameWidth(isMobile: boolean) {
  const ratio = isMobile ? MOBILE_PAGE_RATIO : DESKTOP_PAGE_RATIO * 2;
  const maxViewportWidth = isMobile ? 94 : 92;
  return `min(${maxViewportWidth}vw, calc((100dvh - ${BOOK_READER_CHROME_PX}px) * ${ratio.toFixed(4)}))`;
}

/** 위 제목줄의 대략 높이(px). */
export const BOOK_READER_HEADER_PX = 68;

/**
 * 책 윗부분이 오는 자리: 화면 위에서 이만큼(%) 내려온 곳. 세로로 긴 키오스크
 * 첫 화면의 이름 검색칸 높이와 맞춘다 (2026-09-16 현장 요청).
 */
export const BOOK_READER_TOP_TARGET_VH = 25;

/**
 * 책과 넘김 단추 묶음을 위에서 얼마나 띄울지.
 *
 * 전에는 책을 남는 공간의 한가운데 두고 넘김 단추는 화면 맨 아래에 붙였다.
 * 세로로 긴 키오스크에서는 책이 화면 가운데쯤에, 단추는 한참 아래에 떨어져
 * 있었다. 이제 책은 위쪽(검색칸 높이)에, 단추는 책 바로 밑에 둔다.
 * 남는 공간이 적은 화면(PC·휴대폰)에서는 예전처럼 가운데에 가깝게 둔다.
 */
export function bookReaderTopOffset(isMobile: boolean) {
  const ratio = isMobile ? MOBILE_PAGE_RATIO : DESKTOP_PAGE_RATIO * 2;
  const maxViewportWidth = isMobile ? 94 : 92;
  const bookHeight = `min(calc(${maxViewportWidth}vw / ${ratio.toFixed(4)}), calc(100dvh - ${BOOK_READER_CHROME_PX}px))`;
  const centered = `calc((100dvh - ${BOOK_READER_CHROME_PX}px - ${bookHeight}) / 2)`;
  const target = `calc(${BOOK_READER_TOP_TARGET_VH}dvh - ${BOOK_READER_HEADER_PX}px)`;
  return `max(0px, min(${centered}, ${target}))`;
}
