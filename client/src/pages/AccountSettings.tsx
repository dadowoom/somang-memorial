import Footer from "@/components/Footer";
import { inputClass } from "@/lib/formStyles";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  // 로그인하지 않은 채로 열면 빈 계정 화면과 탈퇴 폼이 보였다. 로그인으로 보낸다 (2026-09-14).
  useAuth({ redirectOnUnauthenticated: true });
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
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[620px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG ACCOUNT
        </p>
        <h1 className="mt-5 text-[30px] font-light leading-tight text-[#121212]">
          내 계정
        </h1>

        <section className="mt-12">
          <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
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

        <PasswordAndDevicesSection />

        <section className="mt-16">
          <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
            회원 탈퇴
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-[#4a4a4a]">
            <p>탈퇴하시면 회원 정보(성함, 이메일, 휴대폰 번호)를 지웁니다.</p>
            <p>
              <strong className="text-[#121212]">
                이미 만드신 추모관은 지워지지 않습니다.
              </strong>{" "}
              고인을 기억하는 공동의 기록이기 때문입니다. 함께 관리하는 가족이
              있으면 그분에게 주인이 넘어갑니다.{" "}
              <strong className="text-[#121212]">
                이어서 관리할 가족이 없는 추모관이 있으면 탈퇴할 수 없습니다.
              </strong>{" "}
              먼저 '가족 초대'로 가족을 초대해 주시거나, 추모관 정리를 원하시면
              교회로 연락해 주세요.
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

/**
 * 비밀번호 변경과 다른 기기 모두 로그아웃 (2026-09-23).
 * 둘 다 다른 기기의 로그인을 끊고, 지금 이 기기는 로그인된 채 남는다.
 */
function PasswordAndDevicesSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [nextAgain, setNextAgain] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [deviceMessage, setDeviceMessage] = useState("");
  const changePassword = trpc.auth.changePassword.useMutation();
  const logoutOthers = trpc.auth.logoutOtherDevices.useMutation();

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage("");
    if (next.length < 8) {
      setPasswordMessage("새 비밀번호는 8자 이상 입력해 주세요.");
      return;
    }
    if (next !== nextAgain) {
      setPasswordMessage("새 비밀번호 두 칸이 서로 다릅니다.");
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setNextAgain("");
      setPasswordMessage(
        "비밀번호를 바꿨습니다. 다른 기기의 로그인은 모두 끊겼습니다."
      );
    } catch (error) {
      setPasswordMessage(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    }
  }

  async function handleLogoutOthers(event: FormEvent) {
    event.preventDefault();
    setDeviceMessage("");
    try {
      await logoutOthers.mutateAsync({ password: devicePassword });
      setDevicePassword("");
      setDeviceMessage(
        "다른 기기의 로그인을 모두 끊었습니다. 이 기기는 그대로 로그인되어 있습니다."
      );
    } catch (error) {
      setDeviceMessage(
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    }
  }

  return (
    <section className="mt-16">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        비밀번호와 로그인
      </h2>

      <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
        <p className="text-sm font-medium text-[#121212]">비밀번호 바꾸기</p>
        <input
          type="password"
          required
          value={current}
          onChange={event => setCurrent(event.target.value)}
          placeholder="지금 비밀번호"
          className={inputClass}
          autoComplete="current-password"
        />
        <input
          type="password"
          required
          value={next}
          onChange={event => setNext(event.target.value)}
          placeholder="새 비밀번호 (8자 이상)"
          className={inputClass}
          autoComplete="new-password"
        />
        <input
          type="password"
          required
          value={nextAgain}
          onChange={event => setNextAgain(event.target.value)}
          placeholder="새 비밀번호 한 번 더"
          className={inputClass}
          autoComplete="new-password"
        />
        {passwordMessage ? (
          <p className="text-xs leading-5 text-[#616161]" role="status">
            {passwordMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="h-12 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {changePassword.isPending ? "바꾸는 중..." : "비밀번호 바꾸기"}
        </button>
      </form>

      <form
        onSubmit={handleLogoutOthers}
        className="mt-10 space-y-4 border-t border-[#e2e2e2] pt-6"
      >
        <p className="text-sm font-medium text-[#121212]">
          다른 기기 모두 로그아웃
        </p>
        <p className="text-sm leading-7 text-[#4a4a4a]">
          교회나 다른 사람의 컴퓨터에서 로그아웃하지 않고 나오셨다면 눌러
          주세요. 비밀번호는 바뀌지 않고, 지금 이 기기만 로그인된 채 남습니다.
        </p>
        <input
          type="password"
          required
          value={devicePassword}
          onChange={event => setDevicePassword(event.target.value)}
          placeholder="지금 비밀번호"
          className={inputClass}
          autoComplete="current-password"
        />
        {deviceMessage ? (
          <p className="text-xs leading-5 text-[#616161]" role="status">
            {deviceMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={logoutOthers.isPending}
          className="h-12 w-full border border-[#18181b] text-sm font-medium text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white disabled:opacity-40"
        >
          {logoutOthers.isPending ? "처리 중..." : "다른 기기 모두 로그아웃"}
        </button>
      </form>
    </section>
  );
}
