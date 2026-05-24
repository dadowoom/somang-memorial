import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, LockKeyhole, Mail, Phone, User } from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type Mode = "login" | "signup";

const inputClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";
const labelClass = "mb-2 block text-xs font-medium text-[#616161]";

function getRedirectPath() {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("/login")) {
    return "/";
  }
  return redirect;
}

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "login";
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const redirect = params.get("redirect");

  if (mode === "signup" || redirect === "/memorial/create") {
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
  const [signupConsent, setSignupConsent] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const redirectPath = useMemo(getRedirectPath, []);
  const isCreateRedirect = redirectPath === "/memorial/create";

  useEffect(() => {
    if (meQuery.data) {
      setLocation(redirectPath);
    }
  }, [meQuery.data, redirectPath, setLocation]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      await utils.auth.me.invalidate();
      setLocation(redirectPath);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "로그인 중 문제가 생겼습니다."
      );
    }
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (signupPassword.length < 8) {
      setMessage("비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!signupConsent) {
      setMessage("회원가입과 추모관 생성을 위한 필수 동의가 필요합니다.");
      return;
    }

    try {
      const result = await signupMutation.mutateAsync({
        name: signupName,
        email: signupEmail,
        phone: signupPhone || undefined,
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
                회원가입 후 바로
                <br />
                소망을 남깁니다
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-[#616161]">
                소망 만들기는 회원가입 또는 로그인 후 이용할 수 있습니다.
                가입을 마치면 바로 추모관 생성 화면으로 이어집니다.
              </p>

              <div className="mt-10 grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-3">
                {[
                  ["01", "회원가입"],
                  ["02", "소망 만들기"],
                  ["03", "추모관 생성"],
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
                      이미 계정이 있다면 로그인 후 소망 만들기를 이어갈 수
                      있습니다.
                    </div>
                  )}
                  <Field label="이메일">
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
                  <Field label="비밀번호">
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
                </form>
              ) : (
                <form onSubmit={submitSignup} className="mt-8 space-y-6">
                  {isCreateRedirect && (
                    <div className="border border-[#dbdad7] p-4 text-sm leading-6 text-[#616161]">
                      처음 이용하시는 경우 회원가입을 마치면 바로 소망 만들기
                      화면으로 이동합니다.
                    </div>
                  )}
                  <Field label="성함">
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
                  <Field label="이메일">
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
                  <Field label="휴대폰 번호">
                    <div className="relative">
                      <input
                        value={signupPhone}
                        onChange={event => setSignupPhone(event.target.value)}
                        className={`${inputClass} pr-9`}
                        placeholder="010-0000-0000"
                        autoComplete="tel"
                      />
                      <Phone className="pointer-events-none absolute right-0 top-3.5 h-4 w-4 text-[#777]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#8a8a8a]">
                      추모관 작성과 안내 확인에 필요한 연락처입니다.
                    </p>
                  </Field>
                  <Field label="비밀번호">
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
                  </Field>
                  <Field label="비밀번호 확인">
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
                  </Field>

                  <label className="flex gap-3 border border-[#dbdad7] p-4 text-sm leading-6 text-[#616161]">
                    <input
                      type="checkbox"
                      checked={signupConsent}
                      onChange={event => setSignupConsent(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#18181b]"
                      required
                    />
                    <span>
                      회원가입과 추모관 생성에 필요한 개인정보 수집 및 이용에
                      동의합니다.
                    </span>
                  </label>

                  <SubmitButton
                    pending={signupMutation.isPending}
                    label="회원가입하고 시작하기"
                    pendingLabel="가입 중"
                  />
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
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
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
