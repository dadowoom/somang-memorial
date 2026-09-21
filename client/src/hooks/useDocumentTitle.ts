import { useEffect } from "react";

const DEFAULT_TITLE = "소망이 있는 곳";

/**
 * 브라우저 탭 제목 (2026-09-21). 전에는 모든 화면이 "소망이 있는 곳" 이라,
 * 탭을 여러 개 열면 어느 추모관인지 알 수 없었다. 화면을 떠나면 기본값으로 돌린다.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
