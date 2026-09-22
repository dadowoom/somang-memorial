import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 추도일 알림 신청 흐름 (2026-09-23 본인 번호 확인 추가).
 *
 * 1) 휴대폰 번호 + 동의 → "인증번호 받기" → 카카오톡으로 6자리가 간다.
 * 2) 6자리를 넣고 "알림 신청" → 번호가 맞으면 신청이 저장되고 확인 안내가 간다.
 *
 * 홈페이지 추모관 화면과 키오스크 화면이 같은 흐름을 쓴다. 화면 모양만 다르다.
 */
export function useReminderSignup({
  memorialSlug,
  accessToken,
  networkMode,
  isOffline,
  offlineMessage,
  onDone,
}: {
  memorialSlug: string;
  accessToken?: string;
  networkMode?: "always";
  isOffline?: () => boolean;
  offlineMessage?: string;
  onDone?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [message, setMessage] = useState("");

  const requestCode = trpc.reminder.requestCode.useMutation({
    networkMode,
    onSuccess: () => {
      setStep("code");
      setCode("");
      setMessage(
        "카카오톡으로 인증번호 6자리를 보냈습니다. 5분 안에 넣어 주세요."
      );
    },
    onError: error => {
      setMessage(error.message || "인증번호를 보내지 못했습니다.");
    },
  });

  const subscribe = trpc.reminder.subscribe.useMutation({
    networkMode,
    onSuccess: data => {
      setPhone("");
      setCode("");
      setConsent(false);
      setStep("phone");
      setMessage(
        data.confirmationSent
          ? `${data.memorialDay} 추도일 알림 신청이 저장되었습니다. 카카오톡으로 확인 안내를 보냈습니다.`
          : `${data.memorialDay} 추도일 알림 신청이 저장되었습니다. ${data.confirmationMessage}`
      );
      onDone?.();
    },
    onError: error => {
      setMessage(error.message || "알림 신청 중 문제가 생겼습니다.");
    },
  });

  const pending = requestCode.isPending || subscribe.isPending;

  function offline() {
    if (isOffline?.()) {
      setMessage(offlineMessage ?? "인터넷 연결을 확인해 주세요.");
      return true;
    }
    return false;
  }

  /** 인증번호를 보낸다. 요청을 보냈으면 true. */
  function sendCode() {
    if (pending) return false;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setMessage("휴대폰 번호를 입력해 주세요.");
      return false;
    }
    if (!consent) {
      setMessage("추도일 알림을 위한 번호 저장에 동의해 주세요.");
      return false;
    }
    if (offline()) return false;
    setMessage("");
    requestCode.mutate({
      memorialSlug,
      phone: trimmedPhone,
      accessToken: accessToken || undefined,
    });
    return true;
  }

  /** 받은 인증번호로 신청한다. 요청을 보냈으면 true. */
  function submitCode() {
    if (pending) return false;
    const trimmedCode = code.replace(/\D/g, "");
    if (trimmedCode.length !== 6) {
      setMessage("카카오톡으로 받은 인증번호 6자리를 넣어 주세요.");
      return false;
    }
    if (offline()) return false;
    setMessage("");
    subscribe.mutate({
      memorialSlug,
      phone: phone.trim(),
      code: trimmedCode,
      consent: true,
      accessToken: accessToken || undefined,
    });
    return true;
  }

  /** 번호를 잘못 넣었을 때 처음으로 돌아간다. */
  function changePhone() {
    setStep("phone");
    setCode("");
    setMessage("");
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      setMessage("");
    },
    code,
    setCode: (value: string) => {
      setCode(value.replace(/\D/g, "").slice(0, 6));
      setMessage("");
    },
    consent,
    setConsent,
    step,
    message,
    pending,
    sendingCode: requestCode.isPending,
    subscribing: subscribe.isPending,
    sendCode,
    submitCode,
    changePhone,
  };
}
