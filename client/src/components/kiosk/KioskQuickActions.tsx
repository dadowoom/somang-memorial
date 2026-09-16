import { kioskGuideQrUrl } from "@/lib/kioskQuickActions";
import { useScrollLock } from "@/lib/scrollLock";
import { CircleHelp, Eye, Phone, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { lazy, Suspense, useEffect, useState } from "react";
import "./kioskQuickActions.css";

// 홈페이지 이용 안내 본문을 그대로 쓴다 (2026-09-16). 키오스크 첫 화면을 가볍게
// 두려고 "이용 안내"를 눌렀을 때만 내려받는다.
const GuideContent = lazy(() => import("@/components/guide/GuideContent"));

export const KIOSK_GUIDE_LOADING_TEXT = "이용 안내를 불러오고 있습니다.";
export const KIOSK_GUIDE_QR_TITLE = "휴대폰으로 QR을 찍어 보세요";
export const KIOSK_GUIDE_QR_TEXT =
  "홈페이지가 열립니다. 로그인하면 우리 가족의 추모관을 직접 만들 수 있습니다.";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 이용 안내 창 오른쪽 아래(5시 방향)에 붙어 다니는 QR 안내 (2026-09-16 현장 요청).
 * 본문을 아무리 내려도 같은 자리에 있고, 굵은 테두리와 숨 쉬는 그림자로 눈에 띈다.
 * QR 그림은 화면에서 그때그때 만든다. 그림 파일을 따로 두지 않으니 주소가 바뀌어도
 * 그대로 맞고, 만들지 못하면 글자 안내만 남는다.
 */
export function KioskGuideQr() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    let cancelled = false;
    setHost(window.location.host);
    QRCode.toDataURL(kioskGuideQrUrl(window.location.origin), {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
      color: { dark: "#171717", light: "#ffffff" },
    })
      .then(url => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        // QR 을 못 그리면 글자 안내만 보여 준다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="kiosk-guide-qr" aria-label="휴대폰으로 이어서 보기">
      <div className="kiosk-guide-qr-code">
        {dataUrl ? (
          <img src={dataUrl} alt="홈페이지로 가는 QR 코드" />
        ) : (
          <QrCode aria-hidden="true" strokeWidth={1.4} />
        )}
      </div>
      <p className="kiosk-guide-qr-title">{KIOSK_GUIDE_QR_TITLE}</p>
      <p className="kiosk-guide-qr-text">{KIOSK_GUIDE_QR_TEXT}</p>
      {host && <p className="kiosk-guide-qr-url">{host}</p>}
    </aside>
  );
}

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

      {/* 본문은 이 안에서 스크롤되고, QR 안내는 그 위 오른쪽 아래에 고정된다. */}
      <div className="kiosk-guide-main">
        <div className="kiosk-guide-body">
          <div className="guide-page guide-page--kiosk">
            <Suspense
              fallback={
                <p className="kiosk-guide-loading">
                  {KIOSK_GUIDE_LOADING_TEXT}
                </p>
              }
            >
              <GuideContent variant="kiosk" />
            </Suspense>
          </div>
        </div>
        <KioskGuideQr />
      </div>

      <div className="kiosk-guide-foot">
        <button type="button" onClick={onClose} className="kiosk-guide-done">
          확인했습니다
        </button>
      </div>
    </div>
  );
}
