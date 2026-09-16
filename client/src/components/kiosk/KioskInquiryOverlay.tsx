import { useScrollLock } from "@/lib/scrollLock";
import {
  useKioskKeyboard,
  useKioskKeyboardField,
} from "@/components/kiosk/KioskKeyboard";
import { getKioskErrorCode } from "@/lib/kioskError";
import {
  CHURCH_INQUIRY,
  COMPANY_INQUIRY,
  KIOSK_INQUIRY_DONE_CLOSE_MS,
} from "@/lib/kioskInquiry";
import { trpc } from "@/lib/trpc";
import {
  formatPhoneWhileTyping,
  KIOSK_INQUIRY_NAME_MAX,
  normalizeKoreanPhone,
  phoneDigits,
} from "@shared/kioskInquiry";
import { Check, Phone, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import "./kioskInquiry.css";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 키오스크 "문의" 창 (2026-09-16). 화면을 반반으로 나눠
 * 왼쪽은 교회 경조부 안내, 오른쪽은 제작 업체 문의(전화번호 남기기)다.
 */
export default function KioskInquiryOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  const { isOpen, keyboardHeight } = useKioskKeyboard();
  // 문의 창이 떠 있는 동안 뒤 화면을 잠근다.
  useScrollLock();

  return (
    <div
      className="kiosk-inquiry-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-inquiry-title"
      style={{ bottom: isOpen ? keyboardHeight : 0 }}
    >
      <div className="kiosk-inquiry-head">
        <div>
          <p className="kiosk-inquiry-eyebrow">SOMANG MEMORIAL</p>
          <h2
            id="kiosk-inquiry-title"
            className="kiosk-inquiry-title"
            style={serifStyle}
          >
            문의
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="kiosk-inquiry-close"
          aria-label="문의 닫기"
        >
          <X strokeWidth={1.7} />
        </button>
      </div>

      <div className="kiosk-inquiry-body">
        <section
          className="kiosk-inquiry-half"
          aria-label={CHURCH_INQUIRY.title}
        >
          <p className="kiosk-inquiry-eyebrow">{CHURCH_INQUIRY.eyebrow}</p>
          <h3 className="kiosk-inquiry-half-title" style={serifStyle}>
            {CHURCH_INQUIRY.title}
          </h3>
          <p className="kiosk-inquiry-phone">
            <Phone aria-hidden="true" strokeWidth={1.6} />
            <span>{CHURCH_INQUIRY.phone}</span>
          </p>
          {CHURCH_INQUIRY.lines.map(line => (
            <p key={line} className="kiosk-inquiry-line">
              {line}
            </p>
          ))}
        </section>

        <CompanyInquiryForm onClose={onClose} />
      </div>
    </div>
  );
}

function CompanyInquiryForm({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const submit = trpc.kioskInquiry.submit.useMutation({
    networkMode: "always",
  });

  const phoneField = useKioskKeyboardField<HTMLInputElement>({
    id: "kiosk-inquiry-phone",
    label: "전화번호",
    value: phone,
    onChange: value => {
      setPhone(phoneDigits(value).slice(0, 11));
      setMessage("");
    },
    maxLength: 11,
    defaultMode: "number",
    submitLabel: COMPANY_INQUIRY.submitLabel,
    submitDisabled: submit.isPending,
    onSubmit: () => {
      void send();
      return false;
    },
  });
  const nameField = useKioskKeyboardField<HTMLInputElement>({
    id: "kiosk-inquiry-name",
    label: "성함 (선택)",
    value: name,
    onChange: value => setName(value.slice(0, KIOSK_INQUIRY_NAME_MAX)),
    maxLength: KIOSK_INQUIRY_NAME_MAX,
    variant: "korean-name",
    submitLabel: "입력 완료",
  });

  // 접수 완료 화면은 잠시 뒤 스스로 닫힌다 (다음 관람객을 위해).
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(onClose, KIOSK_INQUIRY_DONE_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [done, onClose]);

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
        setMessage("연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  }

  if (done) {
    return (
      <section className="kiosk-inquiry-half kiosk-inquiry-half--done">
        <div className="kiosk-inquiry-done-mark" aria-hidden="true">
          <Check strokeWidth={2} />
        </div>
        <h3 className="kiosk-inquiry-half-title" style={serifStyle}>
          {COMPANY_INQUIRY.doneTitle}
        </h3>
        <p className="kiosk-inquiry-line">{COMPANY_INQUIRY.doneText}</p>
        <p className="kiosk-inquiry-line">
          남기신 번호: {formatPhoneWhileTyping(phone)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="kiosk-inquiry-submit"
        >
          확인
        </button>
      </section>
    );
  }

  return (
    <section
      className="kiosk-inquiry-half kiosk-inquiry-half--form"
      aria-label={COMPANY_INQUIRY.title}
    >
      <p className="kiosk-inquiry-eyebrow">{COMPANY_INQUIRY.eyebrow}</p>
      <h3 className="kiosk-inquiry-half-title" style={serifStyle}>
        {COMPANY_INQUIRY.title}
      </h3>
      {COMPANY_INQUIRY.lines.map(line => (
        <p key={line} className="kiosk-inquiry-line">
          {line}
        </p>
      ))}

      <form
        className="kiosk-inquiry-form"
        onSubmit={event => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="kiosk-inquiry-field">
          <span>전화번호</span>
          <input
            ref={phoneField.ref}
            value={formatPhoneWhileTyping(phone)}
            onChange={event => {
              setPhone(phoneDigits(event.target.value).slice(0, 11));
              setMessage("");
            }}
            placeholder="010-0000-0000"
            autoComplete="off"
            inputMode={phoneField.inputMode}
            onFocus={phoneField.onFocus}
            onClick={phoneField.onClick}
          />
        </label>
        <label className="kiosk-inquiry-field">
          <span>성함 (선택)</span>
          <input
            ref={nameField.ref}
            value={name}
            onChange={event =>
              setName(event.target.value.slice(0, KIOSK_INQUIRY_NAME_MAX))
            }
            placeholder="예: 김소망"
            autoComplete="off"
            maxLength={KIOSK_INQUIRY_NAME_MAX}
            inputMode={nameField.inputMode}
            onFocus={nameField.onFocus}
            onClick={nameField.onClick}
          />
        </label>

        {message && (
          <p className="kiosk-inquiry-error" role="alert">
            {message}
          </p>
        )}

        <button
          type="submit"
          className="kiosk-inquiry-submit"
          disabled={submit.isPending}
        >
          <Send aria-hidden="true" strokeWidth={1.7} />
          {submit.isPending ? "접수 중" : COMPANY_INQUIRY.submitLabel}
        </button>
        <p className="kiosk-inquiry-consent">{COMPANY_INQUIRY.consent}</p>
      </form>
    </section>
  );
}
