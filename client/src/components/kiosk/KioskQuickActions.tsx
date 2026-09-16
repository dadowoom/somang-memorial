import { KIOSK_GUIDE_STEPS } from "@/lib/kioskQuickActions";
import { CircleHelp, Eye, X } from "lucide-react";
import "./kioskQuickActions.css";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 검색 화면 오른쪽 아래(5시 방향)에 세로로 놓이는 동그라미 단추 두 개.
 * 자판이 올라와 있을 때는 CSS 로 숨긴다 (자판과 겹친다).
 */
export function KioskQuickActions({
  onSample,
  onGuide,
}: {
  onSample: () => void;
  onGuide: () => void;
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
    </div>
  );
}

/** "이용 안내"를 눌렀을 때 뜨는 큰 글씨 안내 창. 바깥을 눌러도 닫힌다. */
export function KioskGuideOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="kiosk-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-guide-title"
      onClick={onClose}
    >
      <div
        className="kiosk-guide-panel"
        onClick={event => event.stopPropagation()}
      >
        <div className="kiosk-guide-head">
          <div>
            <p className="kiosk-guide-eyebrow">SOMANG MEMORIAL</p>
            <h2
              id="kiosk-guide-title"
              className="kiosk-guide-title"
              style={serifStyle}
            >
              추모관 이용 안내
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

        <ol className="kiosk-guide-steps">
          {KIOSK_GUIDE_STEPS.map(step => (
            <li key={step.number} className="kiosk-guide-step">
              <span className="kiosk-guide-step-number">{step.number}</span>
              <span className="kiosk-guide-step-body">
                <span className="kiosk-guide-step-title" style={serifStyle}>
                  {step.title}
                </span>
                <span className="kiosk-guide-step-detail">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <button type="button" onClick={onClose} className="kiosk-guide-done">
          확인했습니다
        </button>
      </div>
    </div>
  );
}
