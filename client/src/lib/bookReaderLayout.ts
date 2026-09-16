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
