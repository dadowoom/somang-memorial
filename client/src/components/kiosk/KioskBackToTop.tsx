import { useKioskKeyboard } from "@/components/kiosk/KioskKeyboard";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import "./kioskBackToTop.css";

/** 이만큼 내려갔을 때부터 단추를 보여 준다. */
export const KIOSK_BACK_TO_TOP_AFTER_PX = 240;

/** 순수 판단: 스크롤 위치와 자판 상태로 보일지 정한다 (테스트용). */
export function shouldShowKioskBackToTop(
  scrollY: number,
  keyboardOpen: boolean
) {
  return !keyboardOpen && scrollY > KIOSK_BACK_TO_TOP_AFTER_PX;
}

/**
 * 키오스크 어느 화면에서든 왼쪽 아래(7시 방향)에 뜨는 "맨 위로" 단추 (2026-09-16).
 * 화면을 내려야만 보이고, 자판이 올라와 있으면 숨긴다. 오른쪽 아래(5시)의
 * 예시·안내·문의 단추와 겹치지 않게 반대편에 둔다.
 */
export default function KioskBackToTop() {
  const { isOpen } = useKioskKeyboard();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const update = () => setScrollY(window.scrollY);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!shouldShowKioskBackToTop(scrollY, isOpen)) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })}
      className="kiosk-back-to-top"
      aria-label="맨 위로"
    >
      <ArrowUp aria-hidden="true" strokeWidth={1.8} />
      <span>
        맨
        <br />
        위로
      </span>
    </button>
  );
}
