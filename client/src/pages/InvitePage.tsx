import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const buttonClass =
  "inline-flex min-h-12 items-center justify-center bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const subtleButtonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] hover:bg-[#f5f5f5]";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

/**
 * 가족 초대 링크를 받은 사람이 여는 화면 (2026-09-13).
 * 로그인이 안 되어 있으면 로그인·가입 화면으로 보냈다가 이 주소로 다시 돌아온다.
 */
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [, setLocation] = useLocation();
  const currentPath =
    typeof window === "undefined"
      ? `/invite/${token}`
      : window.location.pathname;
  const { user, loading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: `/login?redirect=${encodeURIComponent(currentPath)}`,
  });
  const utils = trpc.useUtils();
  const [message, setMessage] = useState("");
  const accept = trpc.familyMembers.acceptInvitation.useMutation();

  const infoQuery = trpc.familyMembers.invitationInfo.useQuery(
    { token },
    { enabled: Boolean(user && token), retry: false }
  );

  if (loading) {
    return <StateScreen text="계정 정보를 확인하고 있습니다." />;
  }

  if (!user) {
    return <StateScreen text="로그인 화면으로 이동합니다." />;
  }

  if (infoQuery.isLoading) {
    return <StateScreen text="초대 내용을 확인하고 있습니다." />;
  }

  if (infoQuery.error) {
    return <StateScreen text={errorText(infoQuery.error)} showBack />;
  }

  const info = infoQuery.data;
  if (!info || !info.valid) {
    return (
      <StateScreen
        text="초대 링크가 만료되었거나 더 이상 쓸 수 없습니다. 초대한 가족에게 새 링크를 받아 주세요."
        showBack
      />
    );
  }

  async function handleAccept() {
    setMessage("");
    try {
      const result = await accept.mutateAsync({ token });
      await utils.memorial.mine.invalidate();
      setLocation(result.href);
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[620px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG FAMILY
        </p>
        <h1
          className="mt-5 text-[30px] font-light leading-tight text-[#121212]"
          style={serifStyle}
        >
          가족 초대
        </h1>

        <div className="mt-8 border border-[#b5b0a7] bg-white p-6">
          <p className="text-sm text-[#8a8a8a]">함께 관리할 추모관</p>
          <p
            className="mt-2 text-2xl font-normal text-[#121212]"
            style={serifStyle}
          >
            {info.memorialName}
            {info.memorialRole ? (
              <span className="ml-2 text-base text-[#616161]">
                {info.memorialRole}
              </span>
            ) : null}
          </p>
        </div>

        {info.alreadyMember ? (
          <>
            <p className="mt-6 text-base leading-7 text-[#616161]">
              이미 이 추모관을 관리하고 계십니다. 내 추모관에서 바로 이어가실 수
              있습니다.
            </p>
            <div className="mt-6">
              <Link href="/my/memorials">
                <span className={buttonClass}>내 추모관으로 가기</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 text-base leading-7 text-[#616161]">
              {user.name ? `${user.name} 님, ` : ""}
              가족이 이 추모관을 함께 관리하도록 초대했습니다. 함께 관리하면
              글과 사진, 가족관을 직접 고칠 수 있습니다.
            </p>
            <p className="mt-2 text-xs text-[#8a8a8a]">
              이 링크는 {formatDate(info.expiresAt)}까지 쓸 수 있습니다.
            </p>
            {message && (
              <p className="mt-3 text-sm leading-6 text-[#9f2a2a]">{message}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAccept}
                className={buttonClass}
                disabled={accept.isPending}
              >
                {accept.isPending ? "참여하는 중" : "함께 관리하기"}
              </button>
              <Link href="/">
                <span className={subtleButtonClass}>나중에</span>
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StateScreen({ text, showBack }: { text: string; showBack?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[620px] px-6 pb-24 pt-28 sm:pt-32">
        <div className="border border-[#b5b0a7] bg-white py-20 text-center">
          <p className="mx-auto max-w-md text-sm leading-7 text-[#616161]">
            {text}
          </p>
          {showBack && (
            <Link href="/my/memorials">
              <span className={`mt-6 ${subtleButtonClass}`}>
                내 추모관으로 가기
              </span>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
