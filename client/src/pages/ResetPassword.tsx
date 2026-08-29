import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { LockKeyhole } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

const inputClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";

function getToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = useMemo(getToken, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const confirmReset = trpc.auth.confirmPasswordReset.useMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해주세요.");
      return;
    }
    if (password !== confirm) {
      setMessage("두 비밀번호가 서로 다릅니다.");
      return;
    }

    try {
      await confirmReset.mutateAsync({ token, password });
      setDone(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Navbar />
      <main className="mx-auto w-full max-w-[520px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG ACCOUNT
        </p>
        <h1 className="mt-5 text-[30px] font-light leading-tight text-[#121212]">
          새 비밀번호 정하기
        </h1>

        {!token ? (
          <div className="mt-8 space-y-4 text-sm leading-7 text-[#4a4a4a]">
            <p>
              주소가 올바르지 않습니다. 메일에 있는 주소를 다시 눌러 주세요.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block pt-2 font-medium text-[#121212] underline underline-offset-4"
            >
              재설정 주소 다시 받기
            </Link>
          </div>
        ) : done ? (
          <div className="mt-8 space-y-5 text-sm leading-7 text-[#4a4a4a]">
            <p>비밀번호를 바꿨습니다. 새 비밀번호로 로그인해 주세요.</p>
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="h-12 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              로그인하러 가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            <div>
              <label className="mb-2 block text-xs font-medium text-[#616161]">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="8자 이상"
                  className={inputClass}
                  autoComplete="new-password"
                />
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-4 size-4 text-[#c4c1bb]"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#8a8a8a]">
                8자 이상 입력해 주세요.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[#616161]">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                placeholder="한 번 더 입력"
                className={inputClass}
                autoComplete="new-password"
              />
            </div>

            {message ? (
              <p className="text-xs leading-5 text-[#a3322b]">{message}</p>
            ) : null}

            <button
              type="submit"
              disabled={confirmReset.isPending}
              className="h-12 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {confirmReset.isPending ? "바꾸는 중..." : "비밀번호 바꾸기"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
