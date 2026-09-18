import Navbar from "@/components/Navbar";
import { inputClass, labelClass } from "@/lib/formStyles";
import { trpc } from "@/lib/trpc";
import { getLoginMode } from "@/lib/loginMode";
import { SIGNUP_PRIVACY_NOTICE } from "@shared/consent";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type Mode = "login" | "signup";

const helpTextClass = "mt-2 text-xs leading-5 text-[#8a8a8a]";
const phonePattern = /^[0-9\-\s+()]+$/;

function getRedirectPath() {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (
    !redirect ||
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.startsWith("/login")
  ) {
    return "/";
  }
  return redirect;
}

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "login";
  return getLoginMode(window.location.search);
}

export default function Login() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [message, setMessage] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [serviceConsent, setServiceConsent] = useState(false);
  const [over14Consent, setOver14Consent] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const redirectPath = useMemo(getRedirectPath, []);
  const isCreateRedirect = redirectPath.startsWith("/memorial/create");
  const introText = isCreateRedirect
    ? "추모관 만들기는 로그인 후 이용할 수 있습니다. 처음 방문하셨다면 회원가입을 해 주세요. 가입을 마치면 바로 추모관을 작성할 수 있습니다."
    : "로그인하시면 추모관을 만들거나 가족과 함께 관리하는 기록을 이어갈 수 있습니다. 처음 방문하셨다면 회원가입을 해 주세요.";
  const allConsentChecked = privacyConsent && serviceConsent && over14Consent;
  const passwordConfirmMessage =
    signupPasswordConfirm.length === 0
      ? ""
      : signupPassword === signupPasswordConfirm
        ? "비밀번호가 일치합니다."
        : "비밀번호가 일치하지 않습니다.";

  useEffect(() => {
    if (meQuery.data) {
      setLocation(redirectPath);
    }
  }, [meQuery.data, redirectPath, setLocation]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const identifier = loginIdentifier.trim();

    try {
      await loginMutation.mutateAsync({
        identifier,
        password: loginPassword,
      });
      await utils.auth.me.invalidate();
      setLocation(redirectPath);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "로그인 중 문제가 생겼습니다."
      );
    }
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const name = signupName.trim();
    const email = signupEmail.trim();
    const phone = signupPhone.trim();

    if (name.length < 2) {
      setMessage("성함을 2자 이상 입력해 주세요.");
      return;
    }

    if (!phone) {
      setMessage("휴대폰 번호를 입력해 주세요.");
      return;
    }

    if (!phonePattern.test(phone) || phone.replace(/\D/g, "").length < 10) {
      setMessage("휴대폰 번호 형식으로 입력해 주세요.");
      return;
    }

    if (signupPassword.length < 8) {
      setMessage("비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setMessage("두 비밀번호가 서로 다릅니다.");
      return;
    }

    if (!allConsentChecked) {
      setMessage("필수 동의 항목에 모두 동의해 주세요.");
      return;
    }

    try {
      const result = await signupMutation.mutateAsync({
        name,
        email,
        phone,
        password: signupPassword,
        consents: { privacy: true, terms: true, over14: true },
      });

      await utils.auth.me.invalidate();
      setMessage("가입이 완료되었습니다.");
      setLocation(redirectPath);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "회원가입 중 문제가 생겼습니다."
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#b5b0a7]">
          <div className="account-layout container grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] lg:items-start">
            <div className="account-intro">
              <p className="mb-5 text-xs font-medium tracking-[0.24em] text-[#777]">
                SOMANG ACCOUNT
              </p>
              <h1
                className="break-keep text-4xl font-normal leading-tight md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                소중한 기억을
                <br />
                이어갑니다
              </h1>
              <p className="mt-6 max-w-lg break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                {introText}
              </p>

              <div className="account-steps" aria-label="이용 순서">
                <span>01 회원가입</span>
                <span>02 기록 남기기</span>
                <span>03 가족과 나누기</span>
              </div>
            </div>

            <div className="account-panel">
              <div className="account-tabs">
                {(["login", "signup"] as Mode[]).map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => {
                      setMode(value);
                      setMessage("");
                    }}
                  >
                    {value === "login" ? "로그인" : "회원가입"}
                  </button>
                ))}
              </div>

              {mode === "login" ? (
                <form onSubmit={submitLogin} className="mt-8 space-y-6">
                  {isCreateRedirect && (
                    <div className="border border-[#b5b0a7] p-4 text-sm leading-6 text-[#616161]">
                      로그인하시면 추모관 작성 화면으로 바로 이동합니다.
                    </div>
                  )}
                  <Field label="아이디 또는 이메일" required>
                    <div className="relative">
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={event =>
                          setLoginIdentifier(event.target.value)
                        }
                        className={`${inputClass} pr-9`}
                        placeholder="아이디 또는 이메일 주소"
                        autoComplete="username"
                        required
                      />
                      <User className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                  </Field>
                  <Field label="비밀번호" required>
                    <div className="relative">
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={event => setLoginPassword(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="비밀번호"
                        autoComplete="current-password"
                        required
                      />
                      <LockKeyhole className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                  </Field>

                  <SubmitButton
                    pending={loginMutation.isPending}
                    label="로그인"
                    pendingLabel="확인 중"
                  />

                  <div className="pt-1 text-sm leading-6">
                    <Link
                      href="/forgot-password"
                      className="text-[#616161] underline underline-offset-4 transition-colors hover:text-[#121212]"
                    >
                      비밀번호를 잊으셨나요?
                    </Link>
                  </div>

                  <div className="border-t border-[#b5b0a7] pt-5 text-sm leading-6 text-[#616161]">
                    처음 이용하시나요?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setMessage("");
                      }}
                      className="font-medium text-[#121212] underline underline-offset-4"
                    >
                      회원가입하기
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitSignup} className="mt-8 space-y-6">
                  {isCreateRedirect && (
                    <div className="border border-[#b5b0a7] p-4 text-sm leading-6 text-[#616161]">
                      처음 이용하시는 경우 필수 정보를 확인한 뒤 가입합니다.
                      가입이 완료되면 로그인 상태로 추모관 만들기를 시작합니다.
                    </div>
                  )}
                  <Field label="성함" required>
                    <div className="relative">
                      <input
                        value={signupName}
                        onChange={event => setSignupName(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="홍길동"
                        autoComplete="name"
                        required
                      />
                      <User className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                  </Field>
                  <Field label="이메일" required>
                    <div className="relative">
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={event => setSignupEmail(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                      />
                      <Mail className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                  </Field>
                  <Field label="휴대폰 번호" required>
                    <div className="relative">
                      <input
                        value={signupPhone}
                        onChange={event => setSignupPhone(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="010-0000-0000"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                      />
                      <Phone className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                    <p className={helpTextClass}>
                      추모관 작성과 안내 확인에 필요한 연락처입니다.
                    </p>
                  </Field>
                  <Field label="비밀번호" required>
                    <div className="relative">
                      <input
                        type="password"
                        value={signupPassword}
                        onChange={event =>
                          setSignupPassword(event.target.value)
                        }
                        className={`${inputClass} pr-9`}
                        placeholder="8자 이상"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <LockKeyhole className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                    <p className={helpTextClass}>8자 이상 입력해 주세요.</p>
                  </Field>
                  <Field label="비밀번호 확인" required>
                    <div className="relative">
                      <input
                        type="password"
                        value={signupPasswordConfirm}
                        onChange={event =>
                          setSignupPasswordConfirm(event.target.value)
                        }
                        className={`${inputClass} pr-9`}
                        placeholder="한 번 더 입력"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <LockKeyhole className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                    {passwordConfirmMessage && (
                      <p
                        className={`mt-2 text-xs leading-5 ${
                          signupPassword === signupPasswordConfirm
                            ? "text-[#616161]"
                            : "text-[#9f2a2a]"
                        }`}
                      >
                        {passwordConfirmMessage}
                      </p>
                    )}
                  </Field>

                  <div className="border border-[#b5b0a7] p-4">
                    <label className="flex gap-3 text-sm font-medium leading-6 text-[#121212]">
                      <input
                        type="checkbox"
                        checked={allConsentChecked}
                        onChange={event => {
                          setPrivacyConsent(event.target.checked);
                          setServiceConsent(event.target.checked);
                          setOver14Consent(event.target.checked);
                        }}
                        className="mt-1 h-4 w-4 accent-[#18181b]"
                      />
                      <span>필수 약관 모두 동의</span>
                    </label>

                    <div className="mt-4 space-y-3 border-t border-[#b5b0a7] pt-4">
                      <ConsentCheckbox
                        checked={privacyConsent}
                        onChange={setPrivacyConsent}
                        label="개인정보 수집 및 이용 동의"
                        description={
                          <>
                            수집 항목: {SIGNUP_PRIVACY_NOTICE.items}
                            <br />
                            이용 목적: {SIGNUP_PRIVACY_NOTICE.purpose}
                            <br />
                            보유 기간: {SIGNUP_PRIVACY_NOTICE.retention}
                            <br />
                            {SIGNUP_PRIVACY_NOTICE.refusal}
                          </>
                        }
                        documentHref="/privacy"
                      />
                      <ConsentCheckbox
                        checked={serviceConsent}
                        onChange={setServiceConsent}
                        label="서비스 이용 동의"
                        description="소망교회 디지털 추모관 회원가입과 추모관 생성 절차에 동의합니다."
                        documentHref="/terms"
                      />
                      <ConsentCheckbox
                        checked={over14Consent}
                        onChange={setOver14Consent}
                        label="만 14세 이상입니다"
                        description="만 14세 미만은 보호자 동의 절차가 따로 필요해 회원가입을 받지 않습니다."
                      />
                    </div>
                  </div>

                  <SubmitButton
                    pending={signupMutation.isPending}
                    label="회원가입하고 시작하기"
                    pendingLabel="가입 중"
                  />

                  <div className="border-t border-[#b5b0a7] pt-5 text-sm leading-6 text-[#616161]">
                    이미 계정이 있으신가요?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setMessage("");
                      }}
                      className="font-medium text-[#121212] underline underline-offset-4"
                    >
                      로그인하기
                    </button>
                  </div>
                </form>
              )}

              {message && (
                <div className="mt-6 border border-[#b5b0a7] p-4 text-sm leading-6 text-[#4f4638]">
                  {message}
                </div>
              )}

              <Link href="/">
                <span className="mt-6 inline-block text-xs text-[#777] transition-colors hover:text-[#121212]">
                  홈으로 돌아가기
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-[#9f2a2a]">*</span>}
      </span>
      {children}
    </label>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  description,
  documentHref,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: ReactNode;
  documentHref?: string;
}) {
  const inputId = useId();

  // 동의 문구 옆에 전문 링크를 둔다. 링크를 label 안에 넣으면 눌렀을 때
  // 체크박스까지 같이 바뀌므로 label 밖에 둔다 (2026-09-14).
  return (
    <div className="flex gap-3 text-sm leading-6 text-[#616161]">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#18181b]"
        required
      />
      <span>
        <label htmlFor={inputId} className="block font-medium text-[#121212]">
          [필수] {label}
        </label>
        <span className="mt-1 block text-xs leading-5 text-[#8a8a8a]">
          {description}
        </span>
        {documentHref && (
          <a
            href={documentHref}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs leading-5 text-[#616161] underline underline-offset-4 hover:text-[#121212]"
          >
            전문 보기
          </a>
        )}
      </span>
    </div>
  );
}

function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
      {pending ? (
        <Check className="h-4 w-4" strokeWidth={1.7} />
      ) : (
        <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
      )}
    </button>
  );
}
