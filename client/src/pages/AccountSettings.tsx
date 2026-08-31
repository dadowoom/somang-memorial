import Footer from "@/components/Footer";
import { inputClass } from "@/lib/formStyles";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";


export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const deleteAccount = trpc.auth.deleteAccount.useMutation();

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      await deleteAccount.mutateAsync({ password });
      await utils.invalidate();
      setLocation("/");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Navbar />
      <main className="mx-auto w-full max-w-[620px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG ACCOUNT
        </p>
        <h1 className="mt-5 text-[30px] font-light leading-tight text-[#121212]">
          내 계정
        </h1>

        <section className="mt-12">
          <h2 className="border-b border-[#e5e3df] pb-3 text-lg font-medium text-[#121212]">
            가입 정보
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex gap-6">
              <dt className="w-20 shrink-0 text-[#8a8a8a]">성함</dt>
              <dd className="text-[#121212]">{me.data?.name || "-"}</dd>
            </div>
            <div className="flex gap-6">
              <dt className="w-20 shrink-0 text-[#8a8a8a]">이메일</dt>
              <dd className="break-all text-[#121212]">
                {me.data?.email || "-"}
              </dd>
            </div>
            <div className="flex gap-6">
              <dt className="w-20 shrink-0 text-[#8a8a8a]">휴대폰</dt>
              <dd className="text-[#121212]">{me.data?.phone || "-"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-[#8a8a8a]">
            이 정보를 어떻게 다루는지는{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-[#616161]"
            >
              개인정보처리방침
            </Link>
            에 적어 두었습니다.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="border-b border-[#e5e3df] pb-3 text-lg font-medium text-[#121212]">
            회원 탈퇴
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-[#4a4a4a]">
            <p>탈퇴하시면 회원 정보(성함, 이메일, 휴대폰 번호)를 지웁니다.</p>
            <p>
              <strong className="text-[#121212]">
                이미 만드신 추모관은 지워지지 않습니다.
              </strong>{" "}
              고인을 기억하는 공동의 기록이기 때문입니다. 추모관까지 지우고
              싶으시면 <strong className="text-[#121212]">탈퇴하기 전에</strong>{" "}
              먼저 지워 주세요. 탈퇴 후에는 직접 지우실 수 없습니다.
            </p>
            <p className="text-[#a3322b]">탈퇴는 되돌릴 수 없습니다.</p>
          </div>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-8 h-12 w-full border border-[#b5b0a7] text-sm font-medium text-[#616161] transition-colors hover:border-[#a3322b] hover:text-[#a3322b]"
            >
              회원 탈퇴 진행하기
            </button>
          ) : (
            <form onSubmit={handleDelete} className="mt-8 space-y-6">
              <label className="flex gap-3 text-sm leading-6 text-[#4a4a4a]">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={event => setAcknowledged(event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[#a3322b]"
                  required
                />
                <span>
                  회원 정보가 지워지고 되돌릴 수 없다는 것을 확인했습니다. 내가
                  만든 추모관은 남는다는 것도 알고 있습니다.
                </span>
              </label>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#616161]">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="현재 비밀번호"
                  className={inputClass}
                  autoComplete="current-password"
                />
              </div>

              {message ? (
                <p className="text-xs leading-5 text-[#a3322b]">{message}</p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setPassword("");
                    setAcknowledged(false);
                    setMessage("");
                  }}
                  className="h-12 flex-1 border border-[#b5b0a7] text-sm font-medium text-[#616161] transition-colors hover:border-[#18181b] hover:text-[#121212]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!acknowledged || deleteAccount.isPending}
                  className="h-12 flex-1 bg-[#a3322b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {deleteAccount.isPending ? "처리 중..." : "탈퇴하기"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
