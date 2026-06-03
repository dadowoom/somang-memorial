import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type Mode = "login" | "signup";

const inputClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";
const labelClass = "mb-2 block text-xs font-medium text-[#616161]";
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
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const redirect = getRedirectPath();

  if (mode === "signup" || redirect.startsWith("/memorial/create")) {
    return "signup";
  }

  return "login";
}

export default function Login() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [message, setMessage] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [serviceConsent, setServiceConsent] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const redirectPath = useMemo(getRedirectPath, []);
  const isCreateRedirect = redirectPath.startsWith("/memorial/create");
  const introText = isCreateRedirect
    ? "소망 만들기는 계정 확인 후 이용할 수 있습니다. 처음 방문하셨다면 필수 정보를 입력해 가입하고, 가입 직후 바로 소망 만들기로 이어집니다."
    : "소망 만들기는 계정 확인 후 이용할 수 있습니다. 처음 방문하셨다면 필수 정보를 입력해 가입하고, 가입 직후 바로 서비스를 이용할 수 있습니다.";
  const allConsentChecked = privacyConsent && serviceConsent;
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
    const email = loginEmail.trim();

    try {
      await loginMutation.mutateAsync({
        email,
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
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!allConsentChecked) {
      setMessage("개인정보 수집 및 서비스 이용 필수 동의가 필요합니다.");
      return;
    }

    try {
      const result = await signupMutation.mutateAsync({
        name,
        email,
        phone,
        password: signupPassword,
      });

      await utils.auth.me.invalidate();
      setMessage(
        result.firstAdmin
          ? "최초 관리자 계정으로 가입되었습니다."
          : "가입이 완료되었습니다."
      );
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
        <section className="border-b border-[#dbdad7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.72fr)] lg:items-start">
            <div>
              <p className="mb-5 text-xs font-medium tracking-[0.24em] text-[#777]">
                SOMANG ACCOUNT
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                로그인 후 바로
                <br />
                소망을 남깁니다
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-[#616161]">
                {introText}
              </p>

              <div className="mt-10 grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-3">
                {[
                  ["01", "계정 확인"],
                  ["02", "필수 동의"],
                  ["03", "소망 작성"],
                ].map(([number, text]) => (
                  <div key={number} className="bg-white p-5">
                    <p className="text-xs text-[#777]">{number}</p>
                    <p className="mt-4 text-sm font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#dbdad7] p-5 md:p-7">
              <div className="grid grid-cols-2 gap-px bg-[#dbdad7]">
                {(["login", "signup"] as Mode[]).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setMessage("");
                    }}
                    className={`h-12 bg-white text-sm font-medium transition-colors ${
                      mode === value
                        ? "text-[#121212] ring-1 ring-inset ring-[#18181b]"
                        : "text-[#777] hover:bg-[#faf9f6]"
                    }`}
                  >
                    {value === "login" ? "로그인" : "회원가입"}
                  </button>
                ))}
              </div>

              {mode === "login" ? (
                <form onSubmit={submitLogin} className="mt-8 space-y-6">
                  {isCreateRedirect && (
                    <div className="border border-[#dbdad7] p-4 text-sm leading-6 text-[#616161]">
                      소망 만들기는 로그인 후 이어집니다. 이미 계정이 있다면
                      로그인하면 작성 화면으로 바로 이동합니다.
                    </div>
                  )}
                  <Field label="이메일" required>
                    <div className="relative">
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={event => setLoginEmail(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                      />
                      <Mail className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
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

                  <div className="border-t border-[#dbdad7] pt-5 text-sm leading-6 text-[#616161]">
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
                    <div className="border border-[#dbdad7] p-4 text-sm leading-6 text-[#616161]">
                      처음 이용하시는 경우 필수 정보를 확인한 뒤 가입합니다.
                      가입이 완료되면 로그인 상태로 소망 만들기를 시작합니다.
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

                  <div className="border border-[#dbdad7] p-4">
                    <label className="flex gap-3 text-sm font-medium leading-6 text-[#121212]">
                      <input
                        type="checkbox"
                        checked={allConsentChecked}
                        onChange={event => {
                          setPrivacyConsent(event.target.checked);
                          setServiceConsent(event.target.checked);
                        }}
                        className="mt-1 h-4 w-4 accent-[#18181b]"
                      />
                      <span>필수 약관 모두 동의</span>
                    </label>

                    <div className="mt-4 space-y-3 border-t border-[#dbdad7] pt-4">
                      <ConsentCheckbox
                        checked={privacyConsent}
                        onChange={setPrivacyConsent}
                        label="개인정보 수집 및 이용 동의"
                        description="성함, 이메일, 휴대폰 번호를 회원 확인과 추모관 작성 안내에 사용합니다."
                      />
                      <ConsentCheckbox
                        checked={serviceConsent}
                        onChange={setServiceConsent}
                        label="서비스 이용 동의"
                        description="소망교회 디지털 추모관 회원가입과 추모관 생성 절차에 동의합니다."
                      />
                    </div>
                  </div>

                  <SubmitButton
                    pending={signupMutation.isPending}
                    label="회원가입하고 시작하기"
                    pendingLabel="가입 중"
                  />

                  <div className="border-t border-[#dbdad7] pt-5 text-sm leading-6 text-[#616161]">
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
                <div className="mt-6 border border-[#dbdad7] p-4 text-sm leading-6 text-[#4f4638]">
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
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex gap-3 text-sm leading-6 text-[#616161]">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#18181b]"
        required
      />
      <span>
        <span className="block font-medium text-[#121212]">[필수] {label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#8a8a8a]">
          {description}
        </span>
      </span>
    </label>
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
