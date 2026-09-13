import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ArrowRight, PenLine, Search, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "oklch(0.50 0.07 72)";
const warmText = "oklch(0.25 0.04 50)";
const mutedText = "oklch(0.42 0.02 55)";
const pageSize = 10;
// 편지 카드 배경. 외부(Unsplash) 사진을 쓰다가 2026-09-14 에 소망동산 사진으로
// 바꿨다. 외부 서비스가 막히면 카드가 깨지고, 방문자 주소가 외부로 나가며,
// 남의 풍경 사진은 추모관 성격과도 맞지 않았다. 아래 파일은 이미 홈·소망동산
// 화면에서 쓰는 것이라 새로 내려받을 것이 거의 없다.
const letterImages = [
  "/somang-hill-1.jpg",
  "/somang-hill-2.jpg",
  "/somang-hill-3.jpg",
  "/somang-hill-4.jpg",
];

type SearchField = "all" | "to" | "content" | "author";

function formatDate(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function wrapLetterContent(value: string, maxLineLength = 32) {
  return value
    .split("\n")
    .map(paragraph => {
      const words = paragraph.split(" ");
      const lines: string[] = [];
      let current = "";

      words.forEach(word => {
        if (!current) {
          current = word;
          return;
        }

        if (`${current} ${word}`.length > maxLineLength) {
          lines.push(current);
          current = word;
        } else {
          current = `${current} ${word}`;
        }
      });

      if (current) lines.push(current);
      return lines.join("\n");
    })
    .join("\n");
}

function getLetterImage(index: number) {
  return letterImages[index % letterImages.length];
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

    setMessage("");
    createLetter.mutate({
      recipientName: trimmedRecipient,
      author: trimmedAuthor,
      content: trimmedContent,
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#b5b0a7]">
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

              <div className="border-l border-[#d5c9b4] pl-0 lg:pl-8">
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
                  className="mt-7 inline-flex h-11 items-center justify-center gap-2 bg-[#1f1d1a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#33302b]"
                >
                  <PenLine className="h-4 w-4" strokeWidth={1.7} />
                  편지 쓰기
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="border border-[#b5b0a7]">
                <label className="flex items-center gap-3 px-5 py-4">
                  <Search
                    className="h-5 w-5 shrink-0 text-[#616161]"
                    strokeWidth={1.6}
                  />
                  <input
                    value={query}
                    onChange={event => updateQuery(event.target.value)}
                    placeholder="성함이나 편지 내용으로 찾기"
                    className="h-10 min-w-0 flex-1 bg-transparent text-base text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-4 border border-[#b5b0a7] sm:flex">
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
                    className={`h-12 whitespace-nowrap px-1.5 text-sm transition-colors sm:px-4 ${
                      field === value
                        ? "bg-[#1f1d1a] text-white"
                        : "bg-white text-[#4f4638] hover:bg-[#f9f9f9]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formOpen && (
              <form
                onSubmit={submitLetter}
                className="mt-6 border border-[#d5c9b4] bg-white"
              >
                <div className="grid gap-px bg-[#d5c9b4] md:grid-cols-[1fr_1fr]">
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
                <label className="block border-t border-[#d5c9b4] bg-white p-5">
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
                <div className="flex flex-col justify-between gap-3 border-t border-[#d5c9b4] bg-[#ffffff] p-5 sm:flex-row sm:items-center">
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
                    className="inline-flex h-11 items-center justify-center gap-2 bg-[#1f1d1a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#33302b] disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="grid gap-7 md:grid-cols-2 md:gap-x-9 md:gap-y-10">
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
                      imageUrl={getLetterImage(index)}
                      stagger={index % 2 === 1}
                    />
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  pageNumber => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`h-10 min-w-10 border px-3 text-sm transition-colors ${
                        safePage === pageNumber
                          ? "border-[#1f1d1a] bg-[#1f1d1a] text-white"
                          : "border-[#b5b0a7] bg-white text-[#4f4638] hover:bg-[#f9f9f9]"
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
  imageUrl,
  stagger,
}: {
  serial: number;
  toName: string;
  toRole: string;
  content: string;
  author: string;
  date: string;
  href: string | null;
  imageUrl: string;
  stagger: boolean;
}) {
  const recipient = `${toName} ${toRole}`.trim();

  return (
    <article
      className={`grid h-[300px] overflow-hidden bg-white shadow-[0_10px_28px_rgba(31,29,26,0.14)] ring-1 ring-[#d5c9b4] transition-transform duration-300 hover:-translate-y-1 md:grid-cols-[minmax(0,1fr)_92px] lg:grid-cols-[minmax(0,1fr)_112px] ${
        stagger ? "md:mt-10" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col overflow-hidden p-6 md:p-8">
        <div className="flex items-center justify-between gap-3 text-sm text-[#7a7771]">
          <p>No.{String(serial).padStart(3, "0")}</p>
        </div>

        <div className="mt-8 grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 md:grid-cols-[108px_minmax(0,1fr)] md:gap-6">
          <p
            className="pt-1 text-5xl italic leading-none text-[#2d2b28] md:text-7xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            To
          </p>
          <div className="min-w-0">
            {href ? (
              <Link href={href}>
                <span
                  className="inline-flex max-w-full cursor-pointer items-center gap-2 text-2xl font-light text-[#2d2b28] transition-colors hover:text-[#7f673d] md:text-3xl"
                  style={serifStyle}
                >
                  <span className="min-w-0 truncate">{recipient}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                </span>
              </Link>
            ) : (
              <span
                className="block max-w-full truncate text-2xl font-light text-[#2d2b28] md:text-3xl"
                style={serifStyle}
              >
                {recipient}
              </span>
            )}
            <p
              className="mt-4 whitespace-pre-line text-center text-base leading-8 text-[#74706b] md:text-[17px]"
              style={{
                ...serifStyle,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                overflowWrap: "anywhere",
              }}
            >
              {wrapLetterContent(content)}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6 text-base text-[#2d2b28]">
          {href ? (
            <Link href={href}>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7f673d] transition-colors hover:text-[#2d2b28]">
                추모관 보기
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} />
              </span>
            </Link>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:gap-8">
            <p>{date}</p>
            <p>From {author}</p>
          </div>
        </div>
      </div>

      <div
        className="hidden bg-[#d1d1d1] bg-cover bg-center md:block"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(31,29,26,0.08), rgba(31,29,26,0.18)), url(${imageUrl})`,
          filter: "grayscale(0.18) saturate(0.68) contrast(0.94)",
        }}
      />
    </article>
  );
}
