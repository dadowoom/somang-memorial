import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type KioskMemorial = {
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  isPrivate: boolean;
  href: string;
};

type PrivateSelection = {
  slug: string;
  name: string;
  role: string;
  years: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const idleResetMs = 90_000;
const accessStorageKey = (slug: string) => `somang.memorialAccess.${slug}`;

export default function Kiosk() {
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPrivate, setSelectedPrivate] =
    useState<PrivateSelection | null>(null);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const verifyAccess = trpc.memorial.verifyAccess.useMutation();
  const keyword = submittedKeyword.trim();
  const memorialsQuery = trpc.memorial.search.useQuery(
    { keyword },
    { enabled: keyword.length >= 2, retry: false }
  );
  const results = (memorialsQuery.data ?? []) as KioskMemorial[];

  useEffect(() => {
    let timer = window.setTimeout(resetKiosk, idleResetMs);
    const restart = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(resetKiosk, idleResetMs);
    };

    window.addEventListener("pointerdown", restart);
    window.addEventListener("keydown", restart);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", restart);
      window.removeEventListener("keydown", restart);
    };
  });

  function resetKiosk() {
    setQuery("");
    setSubmittedKeyword("");
    setMessage("");
    setSelectedPrivate(null);
    setPassword("");
    setPasswordMessage("");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextKeyword = query.trim();

    if (nextKeyword.length < 2) {
      setSubmittedKeyword("");
      setMessage("성함을 두 글자 이상 입력해 주세요.");
      inputRef.current?.focus();
      return;
    }

    setMessage("");
    setSubmittedKeyword(nextKeyword);
  }

  function openMemorial(memorial: KioskMemorial) {
    if (memorial.isPrivate) {
      setSelectedPrivate({
        slug: memorial.slug,
        name: memorial.name,
        role: memorial.role,
        years: `${memorial.birthDate} - ${memorial.deathDate}`,
      });
      setPassword("");
      setPasswordMessage("");
      return;
    }

    setLocation(`/kiosk/memorial/${memorial.slug}`);
  }

  async function submitPassword() {
    if (!selectedPrivate) return;

    if (!password.trim()) {
      setPasswordMessage("비밀번호를 입력해 주세요.");
      return;
    }

    try {
      const result = await verifyAccess.mutateAsync({
        slug: selectedPrivate.slug,
        password,
      });

      if (result.accessToken) {
        sessionStorage.setItem(
          accessStorageKey(selectedPrivate.slug),
          result.accessToken
        );
        setLocation(`/kiosk/memorial/${selectedPrivate.slug}`);
      }
    } catch {
      setPasswordMessage("비밀번호가 맞지 않습니다.");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#121212]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[680px] flex-col bg-white">
        <header className="px-8 py-8">
          <button type="button" onClick={resetKiosk} className="text-left">
            <span
              className="block text-[26px] font-normal leading-tight"
              style={serifStyle}
            >
              소망이 있는 곳
            </span>
            <span className="mt-1 block text-sm text-[#777]">
              소망교회 추모관
            </span>
          </button>
        </header>

        <section className="px-8 pb-9 pt-20">
          <h1
            className="text-[42px] font-normal leading-[1.2]"
            style={serifStyle}
          >
            고인 성함 검색
          </h1>
          <p className="mt-4 text-base leading-7 text-[#616161]">
            성함을 입력한 뒤 검색 버튼을 눌러 주세요.
          </p>

          <form onSubmit={handleSearch} className="mt-10">
            <label className="flex h-[76px] items-center gap-4 border border-[#18181b] bg-white px-5">
              <Search className="h-6 w-6 shrink-0" strokeWidth={1.7} />
              <input
                ref={inputRef}
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setMessage("");
                }}
                placeholder="예: 김소망"
                className="min-w-0 flex-1 bg-transparent text-[34px] font-light outline-none placeholder:text-[#b8b8b8]"
                style={serifStyle}
                autoComplete="off"
                inputMode="text"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSubmittedKeyword("");
                    setMessage("");
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#dbdad7]"
                  aria-label="검색어 지우기"
                >
                  <X className="h-5 w-5" strokeWidth={1.7} />
                </button>
              )}
            </label>

            {message && (
              <p className="mt-4 text-base text-[#9f2a2a]">{message}</p>
            )}

            <button
              type="submit"
              className="mt-4 flex h-16 w-full items-center justify-center gap-3 bg-[#18181b] text-lg font-medium text-white"
            >
              검색
              <ArrowRight className="h-5 w-5" strokeWidth={1.7} />
            </button>
          </form>
        </section>

        <section className="min-h-0 flex-1">
          {!submittedKeyword ? null : memorialsQuery.isLoading ? (
            <EmptyPanel title="검색 중입니다." />
          ) : memorialsQuery.isError ? (
            <EmptyPanel title="검색을 완료하지 못했습니다." />
          ) : results.length === 0 ? (
            <EmptyPanel title="일치하는 추모관이 없습니다." />
          ) : (
            <div className="h-full overflow-y-auto border-t border-[#dbdad7]">
              <div className="flex items-center justify-between px-8 py-4">
                <p className="text-sm text-[#616161]">검색 결과</p>
                <p className="text-base text-[#616161]">{results.length}건</p>
              </div>

              <div className="border-t border-[#dbdad7]">
                {results.map(memorial => (
                  <button
                    key={memorial.slug}
                    type="button"
                    onClick={() => openMemorial(memorial)}
                    className="flex w-full items-center justify-between gap-5 border-b border-[#dbdad7] px-8 py-5 text-left active:bg-[#f7f6f2]"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-3">
                        <span
                          className="text-[30px] font-normal leading-tight"
                          style={serifStyle}
                        >
                          {memorial.name}
                        </span>
                        {memorial.isPrivate && (
                          <span className="inline-flex items-center gap-1.5 border border-[#dbdad7] px-2.5 py-1 text-xs text-[#616161]">
                            <LockKeyhole className="h-3.5 w-3.5" />
                            비공개
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block text-[15px] leading-6 text-[#616161]">
                        {memorial.birthDate} - {memorial.deathDate} ·{" "}
                        {memorial.church} · {memorial.role}
                      </span>
                    </span>

                    <ArrowRight className="h-5 w-5 shrink-0 text-[#18181b]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedPrivate && (
        <PrivateAccessPanel
          memorial={selectedPrivate}
          password={password}
          message={passwordMessage}
          pending={verifyAccess.isPending}
          onPassword={value => {
            setPassword(value);
            setPasswordMessage("");
          }}
          onClose={() => {
            setSelectedPrivate(null);
            setPassword("");
            setPasswordMessage("");
          }}
          onSubmit={submitPassword}
        />
      )}
    </main>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center border-t border-[#dbdad7] px-8 text-center">
      <p className="text-lg text-[#616161]">{title}</p>
    </div>
  );
}

function PrivateAccessPanel({
  memorial,
  password,
  message,
  pending,
  onPassword,
  onClose,
  onSubmit,
}: {
  memorial: PrivateSelection;
  password: string;
  message: string;
  pending: boolean;
  onPassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-8">
      <section className="w-full max-w-[600px] border border-[#dbdad7] bg-white p-8">
        <div className="mb-7 flex items-start justify-between gap-6">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#616161]">
              <LockKeyhole className="h-4 w-4" />
              비공개 추모관
            </p>
            <h2 className="text-4xl font-normal" style={serifStyle}>
              {memorial.name}
            </h2>
            <p className="mt-3 text-base text-[#616161]">
              {memorial.years} · {memorial.role}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center border border-[#dbdad7]"
            aria-label="비밀번호 입력 닫기"
          >
            <X className="h-6 w-6" strokeWidth={1.7} />
          </button>
        </div>

        <input
          type="password"
          value={password}
          onChange={event => onPassword(event.target.value)}
          placeholder="비밀번호"
          className="h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#b8b8b8]"
          autoFocus
        />
        {message && <p className="mt-4 text-base text-[#9f2a2a]">{message}</p>}

        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="mt-5 h-16 w-full bg-[#18181b] text-lg font-medium text-white disabled:opacity-50"
        >
          {pending ? "확인 중" : "입장하기"}
        </button>
      </section>
    </div>
  );
}
