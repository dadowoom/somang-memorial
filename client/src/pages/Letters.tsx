import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ArrowRight, PenLine, Search, Send } from "lucide-react";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import "./publicEditorial.css";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "#626262";
const warmText = "#171717";
const mutedText = "#666666";
const pageSize = 10;
type SearchField = "all" | "to" | "content" | "author";

function formatDate(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function Letters() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [field, setField] = useState<SearchField>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const lettersQuery = trpc.letter.recent.useQuery({ limit: 100 });
  // 빠르게 두 번 눌러도 편지가 두 통 저장되지 않게 (2026-09-23).
  const sending = useRef(false);
  const createLetter = trpc.letter.create.useMutation({
    onSuccess: async () => {
      setRecipientName("");
      setAuthor("");
      setContent("");
      setMessage("편지가 남겨졌습니다.");
      await utils.letter.recent.invalidate();
    },
    onError: error => setMessage(error.message),
  });

  const results = useMemo(() => {
    const keyword = query.trim();
    const letters = lettersQuery.data ?? [];
    if (!keyword) return letters;

    return letters.filter(letter => {
      const toText = `${letter.memorialName ?? ""} ${letter.memorialRole ?? ""}`;
      const values = {
        to: toText,
        content: letter.content,
        author: letter.author,
      };

      if (field === "all") {
        return Object.values(values).some(value => value.includes(keyword));
      }

      return values[field].includes(keyword);
    });
  }, [field, lettersQuery.data, query]);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleLetters = results.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const updateField = (value: SearchField) => {
    setField(value);
    setPage(1);
  };

  const submitLetter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedRecipient = recipientName.trim();
    const trimmedAuthor = author.trim();
    const trimmedContent = content.trim();

    if (!trimmedRecipient || !trimmedAuthor || !trimmedContent) {
      setMessage("받는 분, 보내는 분, 편지 내용을 모두 입력해 주세요.");
      return;
    }

    if (sending.current || createLetter.isPending) return;
    sending.current = true;
    setMessage("");
    createLetter.mutate(
      {
        recipientName: trimmedRecipient,
        author: trimmedAuthor,
        content: trimmedContent,
      },
      {
        onSettled: () => {
          sending.current = false;
        },
      }
    );
  };

  return (
    <div className="public-editorial letters-page min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="public-hero border-b border-[#b5b0a7]">
          <div className="container py-12 md:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:items-end">
              <div>
                <p
                  className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em]"
                  style={{ color: warmGold }}
                >
                  Letters
                </p>
                <h1
                  className="max-w-3xl text-balance break-keep text-[clamp(30px,4.8vw,64px)] font-light leading-[1.3] [overflow-wrap:anywhere]"
                  style={{ ...serifStyle, color: warmText }}
                >
                  하늘로 보내는 편지
                </h1>
              </div>

              <div className="border-l border-[#dedede] pl-0 lg:pl-8">
                <p
                  className="text-pretty break-keep text-base leading-8 [overflow-wrap:anywhere]"
                  style={{ color: mutedText }}
                >
                  사랑하는 분을 떠올리며, 전하고 싶은 마음을 편지로 남겨 주세요.
                  추모관에 남겨진 편지와 이곳에서 직접 남긴 편지가 함께
                  모입니다.
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(value => !value)}
                  aria-expanded={formOpen}
                  aria-controls="letter-form"
                  className="editorial-action mt-7 inline-flex h-11 items-center justify-center gap-2 bg-[#171717] px-5 text-sm font-medium text-white transition-colors hover:bg-[#393939]"
                >
                  <PenLine className="h-4 w-4" strokeWidth={1.7} />
                  {formOpen ? "편지 접기" : "편지 쓰기"}
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="editorial-search border border-[#b5b0a7]">
                <label className="flex items-center gap-3 px-5 py-4">
                  <Search
                    className="h-5 w-5 shrink-0 text-[#616161]"
                    strokeWidth={1.6}
                  />
                  <input
                    value={query}
                    onChange={event => updateQuery(event.target.value)}
                    placeholder="성함이나 편지 내용으로 찾기"
                    aria-label="성함이나 편지 내용으로 찾기"
                    className="h-10 min-w-0 flex-1 bg-transparent text-base text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                  />
                </label>
              </div>
              <div className="editorial-tabs grid grid-cols-4 border border-[#b5b0a7] sm:flex">
                {[
                  ["all", "전체"],
                  ["to", "받는 분"],
                  ["content", "내용"],
                  ["author", "보내는 분"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField(value as SearchField)}
                    aria-pressed={field === value}
                    className={`h-12 whitespace-nowrap px-1.5 text-sm transition-colors sm:px-4 ${
                      field === value
                        ? "bg-[#171717] text-white"
                        : "bg-white text-[#666666] hover:bg-[#f9f9f9]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formOpen && (
              <form
                id="letter-form"
                onSubmit={submitLetter}
                className="mt-6 border border-[#dedede] bg-white"
              >
                <div className="grid gap-px bg-[#dedede] md:grid-cols-[1fr_1fr]">
                  <label className="bg-white p-5">
                    <span
                      className="text-xs font-medium uppercase tracking-[0.16em]"
                      style={{ color: warmGold }}
                    >
                      받는 분
                    </span>
                    <input
                      value={recipientName}
                      onChange={event => setRecipientName(event.target.value)}
                      placeholder="받는 분의 성함"
                      maxLength={120}
                      className="mt-4 h-11 w-full bg-transparent text-sm text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                    />
                  </label>
                  <label className="bg-white p-5">
                    <span
                      className="text-xs font-medium uppercase tracking-[0.16em]"
                      style={{ color: warmGold }}
                    >
                      보내는 분
                    </span>
                    <input
                      value={author}
                      onChange={event => setAuthor(event.target.value)}
                      placeholder="보내는 분의 이름"
                      maxLength={80}
                      className="mt-4 h-11 w-full bg-transparent text-sm text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                    />
                  </label>
                </div>
                <label className="block border-t border-[#dedede] bg-white p-5">
                  <span
                    className="text-xs font-medium uppercase tracking-[0.16em]"
                    style={{ color: warmGold }}
                  >
                    편지 내용
                  </span>
                  <textarea
                    value={content}
                    onChange={event => setContent(event.target.value)}
                    placeholder="전하고 싶은 마음을 남겨 주세요."
                    maxLength={2000}
                    rows={5}
                    className="mt-4 w-full resize-none bg-transparent text-sm leading-7 text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                  />
                </label>
                <div className="flex flex-col justify-between gap-3 border-t border-[#dedede] bg-[#ffffff] p-5 sm:flex-row sm:items-center">
                  <p
                    className="text-pretty break-keep text-xs leading-6 [overflow-wrap:anywhere]"
                    style={{ color: mutedText }}
                  >
                    {message ||
                      "이곳에서 남긴 편지도 추모관 편지와 함께 모입니다."}
                  </p>
                  <button
                    type="submit"
                    disabled={createLetter.isPending}
                    className="inline-flex h-11 items-center justify-center gap-2 bg-[#171717] px-5 text-sm font-medium text-white transition-colors hover:bg-[#393939] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createLetter.isPending ? "남기는 중" : "편지 남기기"}
                    <Send className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-sm text-[#616161]">
                {lettersQuery.isLoading
                  ? "불러오는 중"
                  : `최근 편지 ${results.length}편`}
              </p>
              <Link href="/memorial/search">
                <button className="h-10 border border-[#b5b0a7] px-4 text-sm text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                  추모관 찾기
                </button>
              </Link>
            </div>

            {lettersQuery.isLoading ? (
              <StateBox text="편지를 불러오고 있습니다." />
            ) : lettersQuery.isError ? (
              <StateBox text="편지를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요." />
            ) : visibleLetters.length === 0 ? (
              <StateBox text="아직 남겨진 편지가 없습니다." />
            ) : (
              <div className="letter-grid">
                {visibleLetters.map((letter, index) => {
                  const serial =
                    results.length - ((safePage - 1) * pageSize + index);
                  const toName = letter.memorialName ?? "하늘";
                  const toRole = letter.memorialRole ?? "";

                  return (
                    <LetterCard
                      key={letter.id}
                      serial={serial}
                      toName={toName}
                      toRole={toRole}
                      content={letter.content}
                      author={letter.author}
                      date={formatDate(letter.createdAt)}
                      href={letter.memorialHref}
                    />
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="letter-pagination mt-8 flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  pageNumber => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      aria-label={`${pageNumber}페이지`}
                      aria-current={safePage === pageNumber ? "page" : undefined}
                      className={`h-10 min-w-10 border px-3 text-sm transition-colors ${
                        safePage === pageNumber
                          ? "border-[#171717] bg-[#171717] text-white"
                          : "border-[#b5b0a7] bg-white text-[#666666] hover:bg-[#f9f9f9]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StateBox({ text }: { text: string }) {
  return (
    <div className="border border-[#b5b0a7] py-20 text-center">
      <p className="text-pretty break-keep px-5 text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
        {text}
      </p>
    </div>
  );
}

function LetterCard({
  serial,
  toName,
  toRole,
  content,
  author,
  date,
  href,
}: {
  serial: number;
  toName: string;
  toRole: string;
  content: string;
  author: string;
  date: string;
  href: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const contentId = useId();
  const recipient = `${toName} ${toRole}`.trim();

  useEffect(() => {
    const element = contentRef.current;
    if (!element || expanded) return;
    const measure = () =>
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content, expanded]);

  return (
    <article className="letter-card">
      <div className="letter-card__meta">
        <span>LETTER {String(serial).padStart(3, "0")}</span>
        <span>{date}</span>
      </div>
      <h2 className="letter-card__recipient">
        <small>그리운 분께</small>
        {recipient}
      </h2>
      <p
        ref={contentRef}
        id={contentId}
        className={`letter-card__content ${expanded ? "" : "letter-card__content--excerpt"}`}
      >
        {content}
      </p>
      {(canExpand || expanded) && (
        <button
          type="button"
          className="letter-card__read"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded(value => !value)}
        >
          {expanded ? "편지 접기" : "편지 펼쳐 읽기"}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      )}
      <div className="letter-card__footer">
        <span>보내는 분 · {author}</span>
        {href && (
          <Link href={href}>
            추모관 보기
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
