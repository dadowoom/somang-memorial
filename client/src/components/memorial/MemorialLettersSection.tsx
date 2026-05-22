import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "oklch(0.50 0.07 72)";
const warmText = "oklch(0.25 0.04 50)";
const mutedText = "oklch(0.42 0.02 55)";

export default function MemorialLettersSection({
  memorialSlug,
  memorialName,
  accessToken,
  isPrivate = false,
}: {
  memorialSlug: string;
  memorialName: string;
  accessToken?: string;
  isPrivate?: boolean;
}) {
  const utils = trpc.useUtils();
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const queryInput = {
    memorialSlug,
    accessToken: accessToken || undefined,
  };

  const lettersQuery = trpc.letter.byMemorial.useQuery(queryInput);
  const createLetterMutation = trpc.letter.create.useMutation({
    onSuccess: async () => {
      setAuthor("");
      setContent("");
      setMessage("편지가 남겨졌습니다.");
      await Promise.all([
        utils.letter.byMemorial.invalidate(queryInput),
        utils.letter.recent.invalidate(),
      ]);
    },
  });

  const submitLetter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedAuthor = author.trim();
    const trimmedContent = content.trim();

    if (!trimmedAuthor || !trimmedContent) {
      setMessage("이름과 편지 내용을 모두 입력해주세요.");
      return;
    }

    setMessage("");
    createLetterMutation.mutate({
      memorialSlug,
      accessToken: accessToken || undefined,
      author: trimmedAuthor,
      content: trimmedContent,
    });
  };

  return (
    <section id="letters" className="py-20 md:py-28">
      <div className="container">
        <SectionHeader
          eyebrow="Letters"
          title="하늘로 보내는 편지"
          description={`${memorialName}님께 전하고 싶은 마음을 남겨주세요.`}
        />

        <div className="mx-auto max-w-5xl">
          <form
            onSubmit={submitLetter}
            className="border border-[#e6ded1] bg-white"
          >
            <div className="grid gap-px bg-[#e6ded1] md:grid-cols-[190px_1fr]">
              <label className="bg-white p-5">
                <span
                  className="text-xs font-medium uppercase tracking-[0.16em]"
                  style={{ color: warmGold }}
                >
                  From
                </span>
                <input
                  value={author}
                  onChange={event => setAuthor(event.target.value)}
                  placeholder="작성자"
                  maxLength={80}
                  className="mt-4 h-11 w-full bg-transparent text-sm text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                />
              </label>
              <label className="bg-white p-5">
                <span
                  className="text-xs font-medium uppercase tracking-[0.16em]"
                  style={{ color: warmGold }}
                >
                  To {memorialName}
                </span>
                <textarea
                  value={content}
                  onChange={event => setContent(event.target.value)}
                  placeholder="전하고 싶은 마음을 남겨주세요."
                  maxLength={2000}
                  rows={5}
                  className="mt-4 w-full resize-none bg-transparent text-sm leading-7 text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                />
              </label>
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-[#e6ded1] bg-[#fbfaf8] p-5 sm:flex-row sm:items-center">
              <p className="text-xs leading-6" style={{ color: mutedText }}>
                {message ||
                  (isPrivate
                    ? "비공개 추모관에만 보관되며 전체 편지 목록에는 표시되지 않습니다."
                    : "남겨진 편지는 하늘로 보내는 편지에 함께 모입니다.")}
              </p>
              <button
                type="submit"
                disabled={createLetterMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 bg-[#1f1d1a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#33302b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createLetterMutation.isPending ? "남기는 중" : "편지 남기기"}
                <Send className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-[#e6ded1]">
            {lettersQuery.isLoading ? (
              <p
                className="border-b border-[#e6ded1] py-7 text-sm"
                style={{ color: mutedText }}
              >
                편지를 불러오고 있습니다.
              </p>
            ) : lettersQuery.data?.length ? (
              lettersQuery.data.map(letter => (
                <article
                  key={letter.id}
                  className="border-b border-[#e6ded1] py-7"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: warmText }}
                    >
                      From {letter.author}
                    </p>
                    <p className="text-xs" style={{ color: mutedText }}>
                      {formatDate(letter.createdAt)}
                    </p>
                  </div>
                  <p
                    className="mt-4 whitespace-pre-line break-words text-sm leading-7"
                    style={{ color: mutedText, overflowWrap: "anywhere" }}
                  >
                    {letter.content}
                  </p>
                </article>
              ))
            ) : (
              <p
                className="border-b border-[#e6ded1] py-7 text-sm"
                style={{ color: mutedText }}
              >
                아직 남겨진 편지가 없습니다.
              </p>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/letters">
              <span
                className="inline-flex h-11 items-center justify-center border border-[#e6ded1] bg-white px-5 text-sm font-medium transition-colors hover:bg-[#faf9f7]"
                style={{ color: "#4f4638" }}
              >
                모든 편지 보기
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <p
        className="mb-3 text-xs font-medium uppercase tracking-[0.28em]"
        style={{ color: warmGold }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-3xl font-light md:text-4xl"
        style={{ ...serifStyle, color: warmText }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7" style={{ color: mutedText }}>
          {description}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <span
          className="h-px w-10"
          style={{ background: warmGold, opacity: 0.55 }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: warmGold }}
        />
        <span
          className="h-px w-10"
          style={{ background: warmGold, opacity: 0.55 }}
        />
      </div>
    </div>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
