import { trpc } from "@/lib/trpc";
import {
  getKioskPasswordErrorMessage,
  KIOSK_CONNECTION_ERROR_MESSAGE,
} from "@/lib/kioskError";
import {
  clearBrowserKioskAccessStorage,
  kioskAccessStorageKey,
  useKioskIdleReset,
} from "@/hooks/useKioskIdleReset";
import {
  useKioskKeyboard,
  useKioskKeyboardField,
} from "@/components/kiosk/KioskKeyboard";
import { ArrowRight, LockKeyhole, RefreshCw, Search, X } from "lucide-react";
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

export default function Kiosk() {
  const [, setLocation] = useLocation();
  const resetGenerationRef = useRef(0);
  const [query, setQuery] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPrivate, setSelectedPrivate] =
    useState<PrivateSelection | null>(null);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const verifyAccess = trpc.memorial.verifyAccess.useMutation({
    networkMode: "always",
  });
  const keyword = submittedKeyword.trim();
  const memorialsQuery = trpc.memorial.search.useQuery(
    { keyword },
    {
      enabled: keyword.length >= 2,
      retry: false,
      networkMode: "always",
    }
  );
  const results = (memorialsQuery.data ?? []) as KioskMemorial[];
  const { closeKeyboard } = useKioskKeyboard();
  const searchKeyboard = useKioskKeyboardField<HTMLInputElement>({
    id: "kiosk-search",
    label: "고인 성함",
    value: query,
    onChange: value => {
      setQuery(value);
      setMessage("");
    },
    maxLength: 80,
    submitLabel: "검색",
    onSubmit: runSearch,
  });

  useKioskIdleReset(resetKiosk);

  useEffect(() => {
    clearBrowserKioskAccessStorage();
  }, []);

  function resetKiosk() {
    resetGenerationRef.current += 1;
    closeKeyboard();
    clearBrowserKioskAccessStorage();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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
    runSearch();
  }

  function runSearch() {
    const nextKeyword = query.trim();

    if (nextKeyword.length < 2) {
      setSubmittedKeyword("");
      setMessage("성함을 두 글자 이상 입력해 주세요.");
      searchKeyboard.ref.current?.focus();
      return false;
    }

    setMessage("");
    setSubmittedKeyword(nextKeyword);
    closeKeyboard();
    searchKeyboard.ref.current?.blur();
    return true;
  }

  function openMemorial(memorial: KioskMemorial) {
    closeKeyboard();
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

  function closePrivatePanel() {
    resetGenerationRef.current += 1;
    closeKeyboard();
    setSelectedPrivate(null);
    setPassword("");
    setPasswordMessage("");
  }

  async function submitPassword() {
    if (!selectedPrivate) return;

    if (!password.trim()) {
      setPasswordMessage("비밀번호를 입력해 주세요.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setPasswordMessage(KIOSK_CONNECTION_ERROR_MESSAGE);
      return;
    }

    const requestGeneration = resetGenerationRef.current;

    try {
      const result = await verifyAccess.mutateAsync({
        slug: selectedPrivate.slug,
        password,
      });

      if (
        result.accessToken &&
        requestGeneration === resetGenerationRef.current
      ) {
        sessionStorage.setItem(
          kioskAccessStorageKey(selectedPrivate.slug),
          result.accessToken
        );
        setLocation(`/kiosk/memorial/${selectedPrivate.slug}`);
      }
    } catch (error) {
      if (requestGeneration !== resetGenerationRef.current) return;
      setPasswordMessage(getKioskPasswordErrorMessage(error));
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
                ref={searchKeyboard.ref}
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setMessage("");
                }}
                placeholder="예: 김소망"
                className="min-w-0 flex-1 bg-transparent text-[34px] font-light outline-none placeholder:text-[#b8b8b8]"
                style={serifStyle}
                autoComplete="off"
                maxLength={80}
                inputMode={searchKeyboard.inputMode}
                onFocus={searchKeyboard.onFocus}
                onClick={searchKeyboard.onClick}
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
          ) : memorialsQuery.isError || memorialsQuery.isPaused ? (
            <EmptyPanel
              title="연결이 원활하지 않습니다."
              description="인터넷 연결을 확인한 뒤 다시 시도해 주세요."
              actionLabel="다시 시도"
              actionPending={memorialsQuery.isFetching}
              onAction={() => void memorialsQuery.refetch()}
            />
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
          onClose={closePrivatePanel}
          onSubmit={submitPassword}
        />
      )}
    </main>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  actionPending = false,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionPending?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center border-t border-[#dbdad7] px-8 py-8 text-center">
      <p className="text-lg font-medium text-[#343434]">{title}</p>
      {description && (
        <p className="mt-3 text-base leading-7 text-[#616161]">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionPending}
          className="mt-6 flex h-14 min-w-[180px] items-center justify-center gap-2 bg-[#18181b] px-6 text-base font-medium text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${actionPending ? "animate-spin" : ""}`}
          />
          {actionPending ? "다시 연결 중" : actionLabel}
        </button>
      )}
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
  const { isOpen } = useKioskKeyboard();
  const passwordKeyboard = useKioskKeyboardField<HTMLInputElement>({
    id: `kiosk-private-password-${memorial.slug}`,
    label: `${memorial.name} 추모관 비밀번호`,
    value: password,
    onChange: onPassword,
    maxLength: 80,
    defaultMode: "number",
    submitLabel: "입장",
    onSubmit: () => {
      onSubmit();
      return false;
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-8"
      style={{ paddingBottom: isOpen ? "min(370px, 56dvh)" : "2rem" }}
    >
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
          ref={passwordKeyboard.ref}
          type="password"
          value={password}
          onChange={event => onPassword(event.target.value)}
          placeholder="비밀번호"
          className="h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#b8b8b8]"
          autoFocus
          autoComplete="off"
          maxLength={80}
          inputMode={passwordKeyboard.inputMode}
          onFocus={passwordKeyboard.onFocus}
          onClick={passwordKeyboard.onClick}
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
