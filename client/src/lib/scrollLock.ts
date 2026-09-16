import { useEffect } from "react";

/**
 * 팝업이나 화면 자판이 떠 있는 동안 뒤 화면이 손가락에 밀려 움직이지 않게 잠근다
 * (2026-09-16 현장 요청: "팝업이 떴는데 뒤에 터치가 먹어서 움직인다").
 *
 * html 과 body 둘 다 잠근다. 한쪽만 잠그면 크롬이 다른 쪽으로 스크롤을 넘겨
 * 여전히 움직이는 경우가 있다. 창이 여러 개 겹쳐 떠도(사진 창 + 자판 등) 마지막
 * 창이 닫힐 때 한 번만 푼다. 코드로 옮기는 스크롤(자판이 입력칸을 위로 올리기)은
 * 잠가도 그대로 된다.
 */
let lockCount = 0;
let saved: { htmlOverflow: string; bodyOverflow: string } | null = null;

export function lockPageScroll(doc: Document = document) {
  if (lockCount === 0) {
    saved = {
      htmlOverflow: doc.documentElement.style.overflow,
      bodyOverflow: doc.body.style.overflow,
    };
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0 && saved) {
      doc.documentElement.style.overflow = saved.htmlOverflow;
      doc.body.style.overflow = saved.bodyOverflow;
      saved = null;
    }
  };
}

/** 이 부품이 화면에 있는 동안 뒤 화면을 잠근다. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    return lockPageScroll();
  }, [active]);
}
