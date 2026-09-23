import { useState } from "react";
import { Link, useParams } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const subtleButtonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] hover:bg-[#f5f5f5] disabled:opacity-50";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * 가족이 편지를 보고 숨기기 (2026-09-23). 추모관을 만든 가족·초대받은 가족·관리자가
 * 들어온 편지를 모두 보고, 추모관에 어울리지 않는 편지를 숨기거나 다시 보이게 한다.
 * 새 편지 알림톡의 "편지 확인하기" 버튼이 이 화면을 연다.
 */
export default function MemorialLetters() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const listQuery = trpc.letter.familyList.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(user && slug), retry: false }
  );
  const update = trpc.letter.familyUpdateStatus.useMutation();
  const [message, setMessage] = useState("");

  if (loading) return <StateScreen text="계정 정보를 확인하고 있습니다." />;
  if (!user) return <StateScreen text="로그인 후 편지를 볼 수 있습니다." />;
  if (listQuery.isLoading) {
    return <StateScreen text="편지를 불러오고 있습니다." />;
  }
  if (listQuery.error) {
    return <StateScreen text={errorText(listQuery.error)} showBack />;
  }
  const info = listQuery.data;
  if (!info) return <StateScreen text="추모관을 찾을 수 없습니다." showBack />;

  const hiddenCount = info.letters.filter(
    letter => letter.status === "hidden"
  ).length;

  async function changeStatus(
    letterId: number,
    author: string,
    status: "published" | "hidden"
  ) {
    setMessage("");
    if (
      status === "hidden" &&
      !window.confirm(
        `${author} 님의 편지를 숨길까요? 숨긴 편지는 방문자에게 보이지 않고, 이 화면에서 언제든 다시 보이게 할 수 있습니다.`
      )
    ) {
      return;
    }
    try {
      await update.mutateAsync({ memorialSlug: slug, letterId, status });
      await utils.letter.familyList.invalidate({ memorialSlug: slug });
      await utils.letter.byMemorial.invalidate();
      setMessage(
        status === "hidden"
          ? `${author} 님의 편지를 숨겼습니다.`
          : `${author} 님의 편지를 다시 보이게 했습니다.`
      );
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[680px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG LETTERS
        </p>
        <h1
          className="mt-5 text-[30px] font-light leading-tight text-[#121212]"
          style={serifStyle}
        >
          받은 편지
        </h1>
        <p className="mt-4 text-base leading-7 text-[#616161]">
          {info.memorialName} 님의 추모관에 도착한 편지입니다. 추모관에 어울리지
          않는 편지는 숨길 수 있습니다. 숨긴 편지는 방문자에게 보이지 않고,
          여기에서 언제든 다시 보이게 할 수 있습니다.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#616161]">
          편지 {info.letters.length}통
          {hiddenCount > 0 ? ` · 숨긴 편지 ${hiddenCount}통` : ""}
        </p>
        {message && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 border border-[#d5cfc5] bg-[#fcfbf8] px-4 py-3 text-base leading-7"
          >
            {message}
          </p>
        )}

        {info.letters.length === 0 ? (
          <div className="mt-8 border border-[#b5b0a7] bg-white px-6 py-16 text-center text-base leading-7 text-[#616161]">
            아직 도착한 편지가 없습니다.
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {info.letters.map(letter => {
              const hidden = letter.status === "hidden";
              return (
                <li
                  key={letter.id}
                  className={`border bg-white p-5 ${
                    hidden
                      ? "border-dashed border-[#b5b0a7] opacity-70"
                      : "border-[#d5cfc5]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-base font-medium text-[#121212]">
                      {letter.author}
                      {hidden && (
                        <span className="ml-2 inline-block border border-[#b5b0a7] px-2 py-0.5 text-xs font-normal text-[#616161]">
                          숨김
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[#8a8a8a]">
                      {formatDateTime(letter.createdAt)}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-[#333]">
                    {letter.content}
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={update.isPending}
                      onClick={() =>
                        void changeStatus(
                          letter.id,
                          letter.author,
                          hidden ? "published" : "hidden"
                        )
                      }
                      className={subtleButtonClass}
                    >
                      {hidden ? "다시 보이게 하기" : "이 편지 숨기기"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-12 border-t border-[#e2e2e2] pt-6">
          <Link href="/my/memorials">
            <span className={subtleButtonClass}>내 추모관으로 돌아가기</span>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StateScreen({
  text,
  showBack,
}: {
  text: string;
  showBack?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[680px] px-6 pb-24 pt-28 sm:pt-32">
        <div className="border border-[#b5b0a7] bg-white py-20 text-center">
          <p className="text-sm leading-7 text-[#616161]">{text}</p>
          {showBack && (
            <Link href="/my/memorials">
              <span className={`mt-6 ${subtleButtonClass}`}>
                내 추모관으로 돌아가기
              </span>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
