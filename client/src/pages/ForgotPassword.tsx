import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const inputClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const requestReset = trpc.auth.requestPasswordReset.useMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      await requestReset.mutateAsync({ email: email.trim() });
      setSent(true);
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
          비밀번호를 잊으셨나요
        </h1>

        {sent ? (
          <div className="mt-8 space-y-4 text-sm leading-7 text-[#4a4a4a]">
            <p>
              가입하신 이메일이라면 비밀번호를 다시 정하는 주소를 보내
              드렸습니다. 메일함을 확인해 주세요.
            </p>
            <p className="text-[#8a8a8a]">
              메일이 보이지 않으면 스팸함도 살펴봐 주세요. 주소는 30분 동안만 쓸
              수 있습니다.
            </p>
            <Link
              href="/login"
              className="inline-block pt-2 text-sm font-medium text-[#121212] underline underline-offset-4"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm leading-7 text-[#616161]">
              가입하실 때 쓰신 이메일 주소를 알려주시면, 비밀번호를 다시 정할 수
              있는 주소를 보내 드립니다.
            </p>

            <form onSubmit={handleSubmit} className="mt-10">
              <label className="mb-2 block text-xs font-medium text-[#616161]">
                이메일
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                  autoComplete="email"
                />
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-4 size-4 text-[#c4c1bb]"
                />
              </div>

              {message ? (
                <p className="mt-4 text-xs leading-5 text-[#a3322b]">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={requestReset.isPending}
                className="mt-8 h-12 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {requestReset.isPending ? "보내는 중..." : "재설정 주소 받기"}
              </button>
            </form>

            <p className="mt-6 text-xs text-[#8a8a8a]">
              비밀번호가 기억나셨나요?{" "}
              <Link
                href="/login"
                className="font-medium text-[#121212] underline underline-offset-2"
              >
                로그인하기
              </Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
