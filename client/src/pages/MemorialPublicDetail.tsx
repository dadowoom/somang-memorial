import Footer from "@/components/Footer";
import { formatLifespan } from "@/lib/lifespan";
import Navbar from "@/components/Navbar";
import MemorialPortrait from "@/components/memorial/MemorialPortrait";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Bell,
  BookOpenText,
  CalendarDays,
  Church,
  LockKeyhole,
  Mail,
  Phone,
  Scroll,
  Send,
  Images,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "#666666";
const warmText = "#171717";
const mutedText = "#626262";

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

type MemorialRecord = {
  id: number;
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  verse: string | null;
  verseRef: string | null;
  summary: string;
  story: string;
  serviceTime: string | null;
  memorialDay: string | null;
  visibility: string;
  timeline: TimelineItem[];
};

type MemorialPhoto = {
  photoUrl: string;
  isRepresentative: number;
};

// 비공개 추모관이면 서버가 인적 사항을 null 로 보낸다 (2026-09-14).
type AccessStatus = {
  slug: string;
  name: string | null;
  role: string | null;
  birthDate: string | null;
  deathDate: string | null;
  church: string | null;
  summary: string | null;
  isPrivate: boolean;
};

const getMemorialAccessStorageKey = (slug: string) =>
  `somang.memorialAccess.${slug}`;

const readStoredAccessToken = (slug: string) => {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(getMemorialAccessStorageKey(slug)) || "";
};

export default function MemorialPublicDetail() {
  const [, params] = useRoute<{ slug: string }>("/memorial/:slug");
  const slug = params?.slug ?? "";
  const [accessToken, setAccessToken] = useState(() =>
    readStoredAccessToken(slug)
  );
  const accessStatusQuery = trpc.memorial.accessStatus.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );

  useEffect(() => {
    setAccessToken(readStoredAccessToken(slug));
  }, [slug]);

  const memorial = memorialQuery.data as MemorialRecord | undefined;
  const isLocked = memorialQuery.error?.data?.code === "FORBIDDEN";
  const photosQuery = trpc.gallery.listByMemorial.useQuery(
    {
      memorialId: memorial?.id ?? 0,
      accessToken: accessToken || undefined,
    },
    { enabled: Boolean(memorial?.id) }
  );
  const photos = (photosQuery.data ?? []) as MemorialPhoto[];
  const portraitPhoto =
    photos.find(photo => photo.isRepresentative === 1)?.photoUrl ??
    photos[0]?.photoUrl;

  return (
    <div
      className="min-h-screen text-[#121212]"
      style={{ background: "#ffffff" }}
    >
      <Navbar />

      <main className="pt-16">
        {memorialQuery.isLoading ? (
          <CenteredState>추모관을 불러오고 있습니다.</CenteredState>
        ) : isLocked ? (
          <PrivateMemorialGate
            slug={slug}
            status={accessStatusQuery.data}
            onUnlocked={token => {
              sessionStorage.setItem(getMemorialAccessStorageKey(slug), token);
              setAccessToken(token);
            }}
          />
        ) : memorialQuery.isError || !memorial ? (
          <CenteredState>추모관을 찾을 수 없습니다.</CenteredState>
        ) : (
          <MemorialContent
            memorial={memorial}
            portraitPhoto={portraitPhoto}
            accessToken={accessToken || undefined}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function PrivateMemorialGate({
  slug,
  status,
  onUnlocked,
}: {
  slug: string;
  status?: AccessStatus;
  onUnlocked: (token: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const verifyAccess = trpc.memorial.verifyAccess.useMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await verifyAccess.mutateAsync({ slug, password });
      if (result.accessToken) {
        onUnlocked(result.accessToken);
      }
    } catch {
      setMessage("비밀번호가 맞지 않습니다.");
    }
  };

  return (
    <section className="bg-white">
      <div className="container py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 border border-[#b5b0a7] p-6 md:grid-cols-[minmax(0,1fr)_360px] md:p-10">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[#18181b]" />
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Private Memorial
              </p>
            </div>

            <h1
              className="text-4xl font-normal leading-tight md:text-6xl"
              style={serifStyle}
            >
              {status?.name || "비공개 추모관"}
            </h1>
            {status?.name && (
              <>
                <p className="mt-4 text-sm leading-7 text-[#616161]">
                  {formatLifespan(status.birthDate ?? "", status.deathDate ?? "")} · {status.church} ·{" "}
                  {status.role}
                </p>
                <p className="mt-8 max-w-xl text-base leading-8 text-[#333333]">
                  {status.summary}
                </p>
              </>
            )}
            {/* 비공개 추모관은 웹 검색에도 키오스크에도 나오지 않는다.
                "검색에서 확인할 수 있다"고 안내하면 가족이 검색만 하다
                헛걸음한다. 실제 동작대로 적는다. */}
            <p className="mt-8 max-w-xl text-pretty break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
              가족만 볼 수 있도록 설정된 추모관입니다. 검색에는 나오지 않으며,
              비밀번호를 아는 분만 들어오실 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="border border-[#b5b0a7] p-5">
            <LockKeyhole className="mb-5 h-6 w-6 text-[#18181b]" />
            <p className="text-sm font-medium text-[#121212]">
              추모관 입장 비밀번호
            </p>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-5 h-12 w-full border-0 border-b border-[#b5b0a7] bg-transparent text-sm outline-none focus:border-[#18181b]"
              placeholder="비밀번호"
              aria-label="추모관 입장 비밀번호"
              autoComplete="off"
            />
            {message && (
              <p className="mt-3 text-xs text-[#9f2a2a]">{message}</p>
            )}
            <button
              type="submit"
              disabled={verifyAccess.isPending}
              className="mt-6 h-11 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {verifyAccess.isPending ? "확인 중" : "입장하기"}
            </button>
            <Link href="/memorial/search">
              <span className="mt-3 block cursor-pointer text-center text-xs text-[#616161] underline-offset-4 hover:underline">
                추모관 찾기로 돌아가기
              </span>
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}

function MemorialContent({
  memorial,
  portraitPhoto,
  accessToken,
}: {
  memorial: MemorialRecord;
  portraitPhoto?: string;
  accessToken?: string;
}) {
  const storyParagraphs = useMemo(
    () => splitParagraphs(memorial.story),
    [memorial.story]
  );
  const serviceTime = memorial.serviceTime || "추후 안내";
  const memorialDayLabel = formatMemorialDay(memorial.memorialDay);

  return (
    <>
      <section className="memorial-hero">
        <div className="container">
          <Link href="/memorial/search" className="memorial-back">
            <ArrowLeft size={16} /> 추모관 찾기
          </Link>
          <div className="memorial-hero__layout">
            <div className="memorial-hero__copy">
              <p className="memorial-hero__eyebrow">
                SOMANG MEMORIAL · 한 성도의 믿음의 여정
              </p>
              <h1 className="memorial-hero__name" style={serifStyle}>
                {memorial.name}
              </h1>
              <div className="memorial-hero__role">
                <span>{memorial.role}</span>
                <span>{memorial.church}</span>
              </div>
              <p className="memorial-hero__summary">{memorial.summary}</p>
              <div className="memorial-facts">
                <HeroFact label="출생" value={memorial.birthDate} />
                {memorial.deathDate && (
                  <HeroFact label="소천" value={memorial.deathDate} />
                )}
                <HeroFact label="교회" value={memorial.church} />
              </div>
            </div>
            <MemorialPortrait
              name={memorial.name}
              birthDate={memorial.birthDate}
              deathDate={memorial.deathDate}
              photo={portraitPhoto}
            />
          </div>
        </div>
      </section>
      <nav className="memorial-record-nav" aria-label="추모관 기록 메뉴">
        <div className="container memorial-record-nav__inner">
          <a href="#life">
            <BookOpenText />
            삶과 신앙
          </a>
          <Link href={`/memorial/${memorial.slug}/archive#gallery`}>
            <Images />
            사진과 기록
          </Link>
          <a href="#letters">
            <Mail />
            편지 남기기
          </a>
          <Link href={`/memorial/${memorial.slug}/family`}>
            <LockKeyhole />
            가족관
          </Link>
          {memorial.deathDate && (
            <Link href={`/memorial/${memorial.slug}/obituary`}>
              <Scroll />
              부고장
            </Link>
          )}
        </div>
      </nav>

      <section id="life" className="py-20 md:py-28">
        <div className="container">
          <SectionHeader
            eyebrow="Life And Faith"
            title="삶과 신앙의 기록"
            description="가족과 교회가 기억하는 따뜻한 여정을 조용히 담았습니다."
          />

          <div className="memorial-life__layout">
            <div className="space-y-6">
              {memorial.verse && (
                <section className="memorial-verse border border-[#dedede] bg-white p-6 md:p-8">
                  <p
                    className="text-[17px] font-light leading-relaxed md:text-[21px]"
                    style={{ ...serifStyle, color: warmText }}
                  >
                    {memorial.verse}
                  </p>
                  {memorial.verseRef && (
                    <p className="mt-5 text-sm" style={{ color: warmGold }}>
                      {memorial.verseRef}
                    </p>
                  )}
                </section>
              )}

              <section className="memorial-service border border-[#dedede] bg-white p-6 md:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <Church
                    className="h-5 w-5"
                    style={{ color: warmGold }}
                    strokeWidth={1.6}
                  />
                  <h2
                    className="text-balance break-keep text-2xl font-light [overflow-wrap:anywhere]"
                    style={{ ...serifStyle, color: warmText }}
                  >
                    예배 안내
                  </h2>
                </div>
                <div className="space-y-4 text-sm leading-7">
                  <p
                    className="flex items-start gap-3"
                    style={{ color: mutedText }}
                  >
                    <CalendarDays
                      className="mt-1 h-4 w-4 shrink-0"
                      strokeWidth={1.6}
                    />
                    <span>{serviceTime}</span>
                  </p>
                  <p
                    className="flex items-start gap-3"
                    style={{ color: mutedText }}
                  >
                    <Bell className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.6} />
                    <span>추도일 {memorialDayLabel}</span>
                  </p>
                </div>

                <MemorialReminderForm
                  memorialSlug={memorial.slug}
                  memorialDay={memorialDayLabel}
                />
              </section>
            </div>

            <article className="memorial-story border border-[#dedede] bg-white p-6 md:p-10">
              <p
                className="mb-4 text-[11px] font-medium uppercase tracking-[0.26em]"
                style={{ color: warmGold }}
              >
                Story
              </p>
              <h2
                className="text-balance break-keep text-3xl font-light [overflow-wrap:anywhere]"
                style={{ ...serifStyle, color: warmText }}
              >
                기억으로 남은 삶
              </h2>
              <div className="mt-7 space-y-5">
                {storyParagraphs.map((paragraph, index) => (
                  <p
                    key={`${paragraph.slice(0, 20)}-${index}`}
                    className="text-sm leading-8 md:text-base"
                    style={{ color: mutedText }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {memorial.timeline.length > 0 && (
        <section
          className="memorial-journey py-20 md:py-28"
        >
          <div className="container">
            <SectionHeader
              eyebrow="Life Journey"
              title="생애의 여정"
              description="하나님과 함께 걸어온 삶의 발자취를 돌아봅니다."
            />

            <div className="mx-auto max-w-4xl border-t border-[#dedede]">
              {memorial.timeline.map((item, index) => (
                <article
                  key={`${item.year}-${item.title}-${index}`}
                  className="grid gap-5 border-b border-[#dedede] py-7 md:grid-cols-[140px_1fr]"
                >
                  <p
                    className="text-lg font-light"
                    style={{ ...serifStyle, color: warmGold }}
                  >
                    {item.year || "기록"}
                  </p>
                  <div>
                    <h3
                      className="text-xl font-light"
                      style={{ ...serifStyle, color: warmText }}
                    >
                      {item.title || "생애 기록"}
                    </h3>
                    {item.description && (
                      <p
                        className="mt-3 text-sm leading-7"
                        style={{ color: mutedText }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <MemorialLetters
        memorialSlug={memorial.slug}
        memorialName={memorial.name}
        accessToken={accessToken}
        isPrivate={memorial.visibility === "private"}
      />
    </>
  );
}

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <section className="container py-20">
      <div className="border border-[#dedede] bg-white py-20 text-center">
        <p className="text-sm" style={{ color: mutedText }}>
          {children}
        </p>
      </div>
    </section>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p
        className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em]"
        style={{ color: warmGold }}
      >
        {label}
      </p>
      <p
        className="text-sm font-medium"
        style={{ ...serifStyle, color: warmText }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function MemorialReminderForm({
  memorialSlug,
  memorialDay,
}: {
  memorialSlug: string;
  memorialDay: string;
}) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const subscribeMutation = trpc.reminder.subscribe.useMutation({
    onSuccess: data => {
      setPhone("");
      setConsent(false);
      setMessage(
        data.confirmationSent
          ? `${data.memorialDay} 추도일 알림 신청이 저장되었고 확인 문자를 보냈습니다.`
          : `${data.memorialDay} 추도일 알림 신청이 저장되었습니다. ${data.confirmationMessage}`
      );
    },
    onError: error => {
      setMessage(error.message || "알림 신청 중 문제가 생겼습니다.");
    },
  });

  const submitReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      setMessage("휴대폰 번호를 입력해 주세요.");
      return;
    }

    if (!consent) {
      setMessage("추도일 알림을 위한 번호 저장에 동의해 주세요.");
      return;
    }

    setMessage("");
    subscribeMutation.mutate({
      memorialSlug,
      phone: trimmedPhone,
      consent: true,
    });
  };

  return (
    <form
      onSubmit={submitReminder}
      className="mt-6 border-t border-[#dedede] pt-5"
    >
      <div className="mb-4 flex items-start gap-3">
        <Phone
          className="mt-1 h-4 w-4 shrink-0"
          style={{ color: warmGold }}
          strokeWidth={1.6}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: warmText }}>
            추도일 알림 받기
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: mutedText }}>
            휴대폰 번호를 남기면 {memorialDay} 추도일 안내를 받을 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <input
          value={phone}
          onChange={event => setPhone(event.target.value)}
          placeholder="010-0000-0000"
          inputMode="tel"
          maxLength={20}
          className="h-11 w-full border border-[#dedede] bg-white px-3 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#555555]"
        />
        <label
          className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-5"
          style={{ color: mutedText }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={event => setConsent(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            추도일 알림 신청을 위해 휴대폰 번호를 저장하는 데 동의합니다.
          </span>
        </label>
        <button
          type="submit"
          disabled={subscribeMutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-[#393939] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {subscribeMutation.isPending ? "신청 중" : "알림 신청"}
          <Bell className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      {message && (
        <p className="mt-3 text-xs leading-5" style={{ color: mutedText }}>
          {message}
        </p>
      )}
    </form>
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
    <div className="memorial-section-heading">
      <p
        className="mb-3 text-xs font-medium uppercase tracking-[0.28em]"
        style={{ color: warmGold }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-balance break-keep text-3xl font-light [overflow-wrap:anywhere] md:text-4xl"
        style={{ ...serifStyle, color: warmText }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="mt-4 text-pretty break-keep text-sm leading-7 [overflow-wrap:anywhere]"
          style={{ color: mutedText }}
        >
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

function MemorialLetters({
  memorialSlug,
  memorialName,
  accessToken,
  isPrivate,
}: {
  memorialSlug: string;
  memorialName: string;
  accessToken?: string;
  isPrivate: boolean;
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
      setMessage("보내는 분의 이름과 편지 내용을 모두 입력해 주세요.");
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
          description={`${memorialName}님께 전하고 싶은 마음을 남겨 주세요.`}
        />

        <div className="mx-auto max-w-5xl">
          <form
            onSubmit={submitLetter}
            className="memorial-letter-form border border-[#dedede] bg-white"
          >
            <div className="grid gap-px bg-[#dedede] md:grid-cols-[190px_1fr]">
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
              <label className="bg-white p-5">
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
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-[#dedede] bg-[#ffffff] p-5 sm:flex-row sm:items-center">
              <p
                className="text-pretty break-keep text-xs leading-6 [overflow-wrap:anywhere]"
                style={{ color: mutedText }}
              >
                {message ||
                  (isPrivate
                    ? "비공개 추모관에만 보관되며 전체 편지 목록에는 표시되지 않습니다."
                    : "남겨진 편지는 하늘로 보내는 편지에 함께 모입니다.")}
              </p>
              <button
                type="submit"
                disabled={createLetterMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 bg-[#171717] px-5 text-sm font-medium text-white transition-colors hover:bg-[#393939] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createLetterMutation.isPending ? "남기는 중" : "편지 남기기"}
                <Send className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
          </form>

          <div className="memorial-letter-list mt-8">
            {lettersQuery.isLoading ? (
              <p
                className="border-b border-[#dedede] py-7 text-sm"
                style={{ color: mutedText }}
              >
                편지를 불러오고 있습니다.
              </p>
            ) : lettersQuery.data?.length ? (
              lettersQuery.data.map(letter => (
                <article
                  key={letter.id}
                  className="border-b border-[#dedede] py-7"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: warmText }}
                    >
                      보내는 분 · {letter.author}
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
                className="border-b border-[#dedede] py-7 text-sm"
                style={{ color: mutedText }}
              >
                아직 남겨진 편지가 없습니다.
              </p>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/letters">
              <span
                className="inline-flex h-11 items-center justify-center border border-[#dedede] bg-white px-5 text-sm font-medium transition-colors hover:bg-[#f9f9f9]"
                style={{ color: "#555555" }}
              >
                편지 모아 보기
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function splitParagraphs(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [value];
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatMemorialDay(value?: string | null) {
  if (!value) return "추후 안내";

  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    return `매년 ${month}월 ${day}일`;
  }

  return value;
}
