import { trpc } from "@/lib/trpc";
import { BellOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/**
 * 추도일 알림 그만 받기 (2026-09-23).
 *
 * 카카오 알림톡의 "알림 그만 받기" 버튼이 /memorial/<주소>?reminder=stop 을 연다.
 * 알림을 받던 번호를 넣고, 그 번호로 온 인증번호를 넣으면 신청 기록을 지운다.
 * 비공개 추모관이어도 이 칸은 열린다 (추모관 내용은 보여 주지 않는다).
 */
export default function ReminderStopPanel({ slug }: { slug: string }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [message, setMessage] = useState("");

  const requestCode = trpc.reminder.requestCode.useMutation({
    onSuccess: () => {
      setStep("code");
      setCode("");
      setMessage(
        "이 번호로 받는 알림이 있으면 카카오톡으로 인증번호 6자리를 보냈습니다. 5분 안에 넣어 주세요."
      );
    },
    onError: error =>
      setMessage(error.message || "인증번호를 보내지 못했습니다."),
  });
  const cancel = trpc.reminder.cancel.useMutation({
    onSuccess: () => {
      setStep("done");
      setMessage("");
    },
    onError: error => setMessage(error.message || "알림을 끄지 못했습니다."),
  });
  const pending = requestCode.isPending || cancel.isPending;

  const sendCode = () => {
    if (pending) return;
    if (!phone.trim()) {
      setMessage("알림을 받던 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setMessage("");
    requestCode.mutate({
      memorialSlug: slug,
      phone: phone.trim(),
      purpose: "cancel",
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "phone") {
      sendCode();
      return;
    }
    if (pending) return;
    if (code.length !== 6) {
      setMessage("카카오톡으로 받은 인증번호 6자리를 넣어 주세요.");
      return;
    }
    setMessage("");
    cancel.mutate({ memorialSlug: slug, phone: phone.trim(), code });
  };

  return (
    <section className="bg-white">
      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-md border border-[#b5b0a7] p-6 md:p-10">
          <BellOff className="h-6 w-6 text-[#666666]" strokeWidth={1.5} />
          <h1 className="mt-4 text-2xl font-normal" style={serifStyle}>
            추도일 알림 그만 받기
          </h1>

          {step === "done" ? (
            <>
              <p
                className="mt-4 text-sm leading-7 text-[#34312d]"
                role="status"
              >
                알림을 껐습니다. 이 추모관의 추도일 알림은 더 이상 보내지 않고,
                남겨 주신 번호도 지웠습니다.
              </p>
              <Link
                href={`/memorial/${encodeURIComponent(slug)}`}
                className="mt-6 inline-flex h-11 w-full items-center justify-center border border-[#18181b] text-sm"
              >
                추모관으로 가기
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <p className="text-sm leading-6 text-[#626262]">
                알림을 받던 휴대폰 번호를 넣으면, 그 번호로 카카오톡 인증번호를
                보내 드립니다. 본인 확인 뒤 알림을 끕니다.
              </p>
              {step === "phone" ? (
                <input
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value);
                    setMessage("");
                  }}
                  placeholder="010-0000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  className="h-11 w-full border border-[#dedede] px-3 text-sm outline-none focus:border-[#555555]"
                />
              ) : (
                <>
                  <p className="text-xs leading-5 text-[#626262]">
                    {phone}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setCode("");
                        setMessage("");
                      }}
                      className="underline underline-offset-2"
                    >
                      번호 바꾸기
                    </button>
                  </p>
                  <input
                    value={code}
                    onChange={event => {
                      setCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      );
                      setMessage("");
                    }}
                    placeholder="인증번호 6자리"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="h-11 w-full border border-[#dedede] px-3 text-center text-lg tracking-[0.4em] outline-none placeholder:text-sm placeholder:tracking-normal focus:border-[#555555]"
                  />
                </>
              )}
              <button
                type="submit"
                disabled={pending}
                className="h-11 bg-[#171717] text-sm font-medium text-white disabled:opacity-50"
              >
                {step === "phone"
                  ? requestCode.isPending
                    ? "보내는 중"
                    : "카카오톡으로 인증번호 받기"
                  : cancel.isPending
                    ? "끄는 중"
                    : "알림 끄기"}
              </button>
              {step === "code" && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={pending}
                  className="h-10 text-xs text-[#626262] underline underline-offset-2 disabled:opacity-50"
                >
                  인증번호 다시 받기
                </button>
              )}
              {message && (
                <p className="text-xs leading-5 text-[#626262]" role="status">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
