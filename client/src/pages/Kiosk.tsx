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

    setLocation(memorial.href);
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
        setLocation(`/memorial/${selectedPrivate.slug}`);
      }
    } catch {
      setPasswordMessage("비밀번호가 맞지 않습니다.");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#efeeea] text-[#121212]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[760px] flex-col bg-white shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        <header className="flex items-center justify-between border-b border-[#dbdad7] px-10 py-8">
          <button type="button" onClick={resetKiosk} className="text-left">
            <span className="block text-[13px] font-medium tracking-[0.28em] text-[#777]">
              SOMANG MEMORIAL
            </span>
            <span
              className="mt-2 block text-3xl font-normal"
              style={serifStyle}
            >
              소망이 있는 곳
            </span>
          </button>

          <button
            type="button"
            onClick={resetKiosk}
            className="h-12 border border-[#dbdad7] px-5 text-sm font-medium text-[#616161]"
          >
            처음으로
          </button>
        </header>

        <section className="px-10 pb-8 pt-16">
          <h1
            className="text-[58px] font-normal leading-[1.15]"
            style={serifStyle}
          >
            고인의 성함을
            <br />
            입력해 주세요
          </h1>
          <p className="mt-7 text-xl leading-9 text-[#616161]">
            성함을 입력하고 검색을 누르면 등록된 추모관을 찾을 수 있습니다.
          </p>

          <form onSubmit={handleSearch} className="mt-14">
            <label className="flex h-24 items-center gap-5 border border-[#18181b] bg-white px-6">
              <Search className="h-8 w-8 shrink-0" strokeWidth={1.7} />
              <input
                ref={inputRef}
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setMessage("");
                }}
                placeholder="예: 김소망"
                className="min-w-0 flex-1 bg-transparent text-5xl font-light outline-none placeholder:text-[#b8b8b8]"
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
                  className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#dbdad7]"
                  aria-label="검색어 지우기"
                >
                  <X className="h-6 w-6" strokeWidth={1.7} />
                </button>
              )}
            </label>

            {message && (
              <p className="mt-4 text-base text-[#9f2a2a]">{message}</p>
            )}

            <button
              type="submit"
              className="mt-5 flex h-20 w-full items-center justify-center gap-3 bg-[#18181b] text-2xl font-medium text-white"
            >
              검색
              <ArrowRight className="h-7 w-7" strokeWidth={1.7} />
            </button>
          </form>
        </section>

        <section className="min-h-0 flex-1 border-t border-[#dbdad7]">
          {!submittedKeyword ? (
            <EmptyPanel
              title="검색을 기다리고 있습니다."
              body="고인의 성함을 입력한 뒤 검색 버튼을 눌러 주세요."
            />
          ) : memorialsQuery.isLoading ? (
            <EmptyPanel title="검색 중입니다." body="잠시만 기다려 주세요." />
          ) : memorialsQuery.isError ? (
            <EmptyPanel
              title="검색을 완료하지 못했습니다."
              body="잠시 뒤 다시 검색해 주세요."
            />
          ) : results.length === 0 ? (
            <EmptyPanel
              title="일치하는 추모관이 없습니다."
              body="성함을 다시 확인해 주세요."
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dbdad7] bg-[#faf9f6] px-10 py-5">
                <p className="text-base text-[#616161]">검색 결과</p>
                <p className="text-xl font-light">{results.length}건</p>
              </div>

              <div className="divide-y divide-[#dbdad7]">
                {results.map(memorial => (
                  <button
                    key={memorial.slug}
                    type="button"
                    onClick={() => openMemorial(memorial)}
                    className="grid w-full gap-5 px-10 py-7 text-left active:bg-[#f5f3ee]"
                  >
                    <span className="flex items-start justify-between gap-5">
                      <span>
                        <span className="flex flex-wrap items-center gap-3">
                          <span
                            className="text-[40px] font-normal leading-tight"
                            style={serifStyle}
                          >
                            {memorial.name}
                          </span>
                          {memorial.isPrivate && (
                            <span className="inline-flex items-center gap-2 border border-[#dbdad7] px-3 py-1.5 text-sm text-[#616161]">
                              <LockKeyhole className="h-4 w-4" />
                              비공개
                            </span>
                          )}
                        </span>
                        <span className="mt-3 block text-lg leading-8 text-[#616161]">
                          {memorial.birthDate} - {memorial.deathDate}
                          <br />
                          {memorial.church} · {memorial.role}
                        </span>
                      </span>

                      <span className="mt-2 flex h-14 w-14 shrink-0 items-center justify-center border border-[#18181b]">
                        <ArrowRight className="h-7 w-7" strokeWidth={1.7} />
                      </span>
                    </span>
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

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center px-10 text-center">
      <div>
        <p className="text-4xl font-normal" style={serifStyle}>
          {title}
        </p>
        <p className="mt-5 text-lg leading-8 text-[#616161]">{body}</p>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-8">
      <section className="w-full max-w-[680px] border border-[#dbdad7] bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#616161]">
              <LockKeyhole className="h-4 w-4" />
              비공개 추모관
            </p>
            <h2 className="text-5xl font-normal" style={serifStyle}>
              {memorial.name}
            </h2>
            <p className="mt-3 text-lg text-[#616161]">
              {memorial.years} · {memorial.role}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-14 items-center justify-center border border-[#dbdad7]"
            aria-label="비밀번호 입력 닫기"
          >
            <X className="h-7 w-7" strokeWidth={1.7} />
          </button>
        </div>

        <input
          type="password"
          value={password}
          onChange={event => onPassword(event.target.value)}
          placeholder="비밀번호"
          className="h-20 w-full border border-[#18181b] px-5 text-4xl outline-none placeholder:text-[#b8b8b8]"
          autoFocus
        />
        {message && <p className="mt-4 text-base text-[#9f2a2a]">{message}</p>}

        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="mt-6 h-18 min-h-18 w-full bg-[#18181b] py-5 text-xl font-medium text-white disabled:opacity-50"
        >
          {pending ? "확인 중" : "입장하기"}
        </button>
      </section>
    </div>
  );
}
