import { useScrollLock } from "@/lib/scrollLock";
import { CircleHelp, Eye, Phone, X } from "lucide-react";
import { lazy, Suspense } from "react";
import "./kioskQuickActions.css";

// 홈페이지 이용 안내 본문을 그대로 쓴다 (2026-09-16). 키오스크 첫 화면을 가볍게
// 두려고 "이용 안내"를 눌렀을 때만 내려받는다.
const GuideContent = lazy(() => import("@/components/guide/GuideContent"));

export const KIOSK_GUIDE_LOADING_TEXT = "이용 안내를 불러오고 있습니다.";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 검색 화면 오른쪽 아래(5시 방향)에 세로로 놓이는 동그라미 단추 두 개.
 * 자판이 올라와 있을 때는 CSS 로 숨긴다 (자판과 겹친다).
 */
export function KioskQuickActions({
  onSample,
  onGuide,
  onInquiry,
}: {
  onSample: () => void;
  onGuide: () => void;
  onInquiry: () => void;
}) {
  return (
    <div className="kiosk-quick-actions" aria-label="바로 가기">
      <button
        type="button"
        onClick={onSample}
        className="kiosk-quick-action kiosk-quick-action--primary"
      >
        <Eye aria-hidden="true" strokeWidth={1.7} />
        <span>
          예시
          <br />
          보기
        </span>
      </button>
      <button type="button" onClick={onGuide} className="kiosk-quick-action">
        <CircleHelp aria-hidden="true" strokeWidth={1.7} />
        <span>
          이용
          <br />
          안내
        </span>
      </button>
      <button type="button" onClick={onInquiry} className="kiosk-quick-action">
        <Phone aria-hidden="true" strokeWidth={1.7} />
        <span>문의</span>
      </button>
    </div>
  );
}

/**
 * "이용 안내"를 눌렀을 때 화면 전체를 덮는 창. 홈페이지의 이용 안내 본문을
 * 그대로 보여 주되, 메뉴·바닥글과 다른 화면으로 가는 단추는 없다 (2026-09-16).
 */
export function KioskGuideOverlay({ onClose }: { onClose: () => void }) {
  // 안내 창이 떠 있는 동안 뒤 화면을 잠근다. 안내 본문은 창 안에서 스크롤된다.
  useScrollLock();
  return (
    <div
      className="kiosk-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-guide-title"
    >
      <div className="kiosk-guide-head">
        <div>
          <p className="kiosk-guide-eyebrow">SOMANG MEMORIAL</p>
          <h2
            id="kiosk-guide-title"
            className="kiosk-guide-title"
            style={serifStyle}
          >
            이용 안내
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="kiosk-guide-close"
          aria-label="안내 닫기"
        >
          <X strokeWidth={1.7} />
        </button>
      </div>

      <div className="kiosk-guide-body">
        <div className="guide-page guide-page--kiosk">
          <Suspense
            fallback={
              <p className="kiosk-guide-loading">{KIOSK_GUIDE_LOADING_TEXT}</p>
            }
          >
            <GuideContent variant="kiosk" />
          </Suspense>
        </div>
      </div>

      <div className="kiosk-guide-foot">
        <button type="button" onClick={onClose} className="kiosk-guide-done">
          확인했습니다
        </button>
      </div>
    </div>
  );
}
