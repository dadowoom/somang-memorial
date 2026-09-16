import {
  getKioskErrorCode,
  KIOSK_CONNECTION_ERROR_MESSAGE,
} from "@/lib/kioskError";
import {
  CHURCH_INQUIRY,
  COMPANY_INQUIRY,
  WEB_INQUIRY,
} from "@/lib/kioskInquiry";
import { useScrollLock } from "@/lib/scrollLock";
import { trpc } from "@/lib/trpc";
import {
  formatPhoneWhileTyping,
  KIOSK_INQUIRY_NAME_MAX,
  normalizeKoreanPhone,
  phoneDigits,
} from "@shared/kioskInquiry";
import { Check, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import "./inquiryDialog.css";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 홈페이지 "문의하기" 창 (2026-09-17 요청). 키오스크 "문의" 창의 오른쪽(제작 업체 문의)과
 * 같은 일을 한다: 전화번호를 남기면 표에 적고 업체 메일로 보낸다. 들어온 곳은 web 이다.
 * 이용 안내 인생화원 칸의 "문의하기"와 예시 추모관의 5시 방향 동그라미가 연다.
 * 키오스크 화면 자판 대신 휴대폰·PC 의 기본 자판을 쓴다.
 */
export default function InquiryDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // 부모가 다시 그려질 때마다 onClose 가 새로 만들어져도 창이 처음 상태로 돌아가지 않게 한다.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const submit = trpc.kioskInquiry.submit.useMutation({
    networkMode: "always",
  });

  useScrollLock();

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);

  async function send() {
    if (submit.isPending) return;
    const normalized = normalizeKoreanPhone(phone);
    if (!normalized) {
      setMessage("전화번호를 다시 확인해 주세요. 예: 010-1234-5678");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage("인터넷 연결이 끊겨 있습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    try {
      await submit.mutateAsync({
        phone: normalized,
        name: name.trim() || undefined,
        source: "web",
      });
      setDone(true);
    } catch (error) {
      const code = getKioskErrorCode(error);
      if (code === "TOO_MANY_REQUESTS") {
        setMessage(
          "문의가 너무 자주 접수됐습니다. 잠시 후 다시 시도해 주세요."
        );
      } else if (code === "BAD_REQUEST" && error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(KIOSK_CONNECTION_ERROR_MESSAGE);
      }
    }
  }

  return (
    <div
      className="inquiry-dialog-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="inquiry-dialog"
      >
        <button
          type="button"
          className="inquiry-dialog-close"
          onClick={onClose}
          aria-label="문의 창 닫기"
        >
          <X aria-hidden="true" strokeWidth={1.7} />
        </button>

        {done ? (
          <div className="inquiry-dialog-done">
            <span className="inquiry-dialog-done-mark" aria-hidden="true">
              <Check strokeWidth={2} />
            </span>
            <h2 id={titleId} className="inquiry-dialog-title" style={serifStyle}>
              {COMPANY_INQUIRY.doneTitle}
            </h2>
            <p className="inquiry-dialog-line">{COMPANY_INQUIRY.doneText}</p>
            <p className="inquiry-dialog-line">
              남기신 번호: {formatPhoneWhileTyping(phone)}
            </p>
            <button
              type="button"
              className="inquiry-dialog-submit"
              onClick={onClose}
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <p className="inquiry-dialog-eyebrow">{WEB_INQUIRY.eyebrow}</p>
            <h2 id={titleId} className="inquiry-dialog-title" style={serifStyle}>
              {WEB_INQUIRY.title}
            </h2>
            {WEB_INQUIRY.lines.map(line => (
              <p key={line} className="inquiry-dialog-line">
                {line}
              </p>
            ))}

            <form
              className="inquiry-dialog-form"
              onSubmit={event => {
                event.preventDefault();
                void send();
              }}
            >
              <label className="inquiry-dialog-field">
                <span>전화번호</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={formatPhoneWhileTyping(phone)}
                  onChange={event => {
                    setPhone(phoneDigits(event.target.value).slice(0, 11));
                    setMessage("");
                  }}
                  placeholder="010-0000-0000"
                />
              </label>
              <label className="inquiry-dialog-field">
                <span>성함 (선택)</span>
                <input
                  value={name}
                  onChange={event =>
                    setName(event.target.value.slice(0, KIOSK_INQUIRY_NAME_MAX))
                  }
                  placeholder="예: 김소망"
                  autoComplete="name"
                  maxLength={KIOSK_INQUIRY_NAME_MAX}
                />
              </label>

              {message && (
                <p className="inquiry-dialog-error" role="alert">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="inquiry-dialog-submit"
                disabled={submit.isPending}
              >
                <Send aria-hidden="true" strokeWidth={1.7} />
                {submit.isPending ? "접수 중" : COMPANY_INQUIRY.submitLabel}
              </button>
              <p className="inquiry-dialog-consent">{COMPANY_INQUIRY.consent}</p>
            </form>

            <p className="inquiry-dialog-church">
              장례·추모 예배·안장 문의는 {CHURCH_INQUIRY.title}{" "}
              <a href={`tel:${CHURCH_INQUIRY.phone}`}>{CHURCH_INQUIRY.phone}</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
