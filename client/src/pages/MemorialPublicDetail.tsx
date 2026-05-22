import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { toImgUrl } from "@/lib/imageUrl";
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
  Send,
  Images,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "oklch(0.50 0.07 72)";
const warmText = "oklch(0.25 0.04 50)";
const mutedText = "oklch(0.42 0.02 55)";
const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";

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

type AccessStatus = {
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  summary: string;
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
    { memorialId: memorial?.id ?? 0 },
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
        <div className="mx-auto grid max-w-5xl gap-8 border border-[#dbdad7] p-6 md:grid-cols-[minmax(0,1fr)_360px] md:p-10">
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
            {status && (
              <>
                <p className="mt-4 text-sm leading-7 text-[#616161]">
                  {status.birthDate} - {status.deathDate} · {status.church} ·{" "}
                  {status.role}
                </p>
                <p className="mt-8 max-w-xl text-base leading-8 text-[#333333]">
                  {status.summary}
                </p>
              </>
            )}
            <p className="mt-8 max-w-xl text-sm leading-7 text-[#616161]">
              기본 정보는 검색에서 확인할 수 있지만, 추모관의 상세 기록은
              비밀번호를 아는 분만 열람할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="border border-[#dbdad7] p-5">
            <LockKeyhole className="mb-5 h-6 w-6 text-[#18181b]" />
            <p className="text-sm font-medium text-[#121212]">
              추모관 입장 비밀번호
            </p>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-5 h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent text-sm outline-none focus:border-[#18181b]"
              placeholder="비밀번호"
              autoFocus
            />
            {message && <p className="mt-3 text-xs text-[#9f2a2a]">{message}</p>}
            <button
              type="submit"
              disabled={verifyAccess.isPending}
              className="mt-6 h-11 w-full bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {verifyAccess.isPending ? "확인 중" : "입장하기"}
            </button>
            <Link href="/memorial/search">
              <span className="mt-3 block cursor-pointer text-center text-xs text-[#616161] underline-offset-4 hover:underline">
                추모관 검색으로 돌아가기
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
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #fbfaf8 100%)",
        }}
      >
        <GoldDust />

        <div className="container relative z-10 py-10 md:py-16 lg:py-20">
          <Link href="/memorial/search">
            <button className="mb-10 inline-flex h-10 items-center gap-2 border border-[#e6ded1] bg-white px-4 text-sm text-[#4f4638] transition-colors hover:bg-[#faf9f7]">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
              추모관 목록
            </button>
          </Link>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.98fr)_minmax(300px,0.68fr)] lg:gap-20">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span
                  className="h-px w-8"
                  style={{ background: warmGold }}
                />
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.28em]"
                  style={{ color: warmGold }}
                >
                  Somang Memorial
                </p>
              </div>

              <h1
                className="text-5xl font-light leading-tight sm:text-6xl lg:text-7xl"
                style={{ ...serifStyle, color: warmText }}
              >
                {memorial.name}
              </h1>
              <p
                className="mt-4 text-xl font-light"
                style={{ ...serifStyle, color: warmGold }}
              >
                {memorial.role}
              </p>
              <p className="mt-2 text-sm" style={{ color: mutedText }}>
                {memorial.church} 온라인 추모관
              </p>

              <div
                className="my-8 h-px w-16"
                style={{ background: warmGold }}
              />

              <p
                className="max-w-2xl text-base font-light leading-8 md:text-lg"
                style={{ ...serifStyle, color: "oklch(0.34 0.04 50)" }}
              >
                {memorial.summary}
              </p>

              <div className="mt-10 grid max-w-xl grid-cols-1 gap-px overflow-hidden border border-[#e6ded1] bg-[#e6ded1] sm:grid-cols-3">
                <HeroFact label="출생" value={memorial.birthDate} />
                <HeroFact label="소천" value={memorial.deathDate} />
                <HeroFact label="교회" value={memorial.church} />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={`/memorial/${memorial.slug}/archive`}>
                  <span className="inline-flex h-11 items-center justify-center gap-2 bg-[#2e2218] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4a3420]">
                    <Images className="h-4 w-4" strokeWidth={1.7} />
                    기념관 자세히 보기
                  </span>
                </Link>
                <a
                  href="#letters"
                  className="inline-flex h-11 items-center justify-center gap-2 border border-[#1f1d1a] bg-white px-5 text-sm font-medium text-[#1f1d1a] transition-colors hover:bg-[#faf9f7]"
                >
                  <Mail className="h-4 w-4" strokeWidth={1.7} />
                  편지 남기기
                </a>
                <a
                  href="#life"
                  className="inline-flex h-11 items-center justify-center gap-2 border border-[#e6ded1] bg-white px-5 text-sm font-medium text-[#4f4638] transition-colors hover:bg-[#faf9f7]"
                >
                  <BookOpenText className="h-4 w-4" strokeWidth={1.7} />
                  삶의 기록 보기
                </a>
                <Link href={`/memorial/${memorial.slug}/family`}>
                  <span className="inline-flex h-11 items-center justify-center gap-2 border border-[#e6ded1] bg-white px-5 text-sm font-medium text-[#4f4638] transition-colors hover:bg-[#faf9f7]">
                    <LockKeyhole className="h-4 w-4" strokeWidth={1.7} />
                    가족관
                  </span>
                </Link>
              </div>
            </div>

            <MemorialPortrait memorial={memorial} portraitPhoto={portraitPhoto} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      <section id="life" className="py-20 md:py-28">
        <div className="container">
          <SectionHeader
            eyebrow="Life And Faith"
            title="삶과 신앙의 기록"
            description="가족과 교회가 기억하는 따뜻한 여정을 조용히 담았습니다."
          />

          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-6">
              {memorial.verse && (
                <section className="border border-[#e6ded1] bg-white p-6 md:p-8">
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

              <section className="border border-[#e6ded1] bg-[#fbfaf8] p-6 md:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <Church
                    className="h-5 w-5"
                    style={{ color: warmGold }}
                    strokeWidth={1.6}
                  />
                  <h2
                    className="text-2xl font-light"
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
                    <Bell
                      className="mt-1 h-4 w-4 shrink-0"
                      strokeWidth={1.6}
                    />
                    <span>추도일 {memorialDayLabel}</span>
                  </p>
                </div>

                <MemorialReminderForm
                  memorialSlug={memorial.slug}
                  memorialDay={memorialDayLabel}
                />
              </section>
            </div>

            <article className="border border-[#e6ded1] bg-white p-6 md:p-10">
              <p
                className="mb-4 text-[11px] font-medium uppercase tracking-[0.26em]"
                style={{ color: warmGold }}
              >
                Story
              </p>
              <h2
                className="text-3xl font-light"
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
          className="py-20 md:py-28"
          style={{ background: "linear-gradient(180deg, #ffffff, #fbfaf8)" }}
        >
          <div className="container">
            <SectionHeader
              eyebrow="Life Journey"
              title="생애의 여정"
              description="하나님과 함께 걸어온 발자취를 시간의 흐름으로 정리했습니다."
            />

            <div className="mx-auto max-w-4xl border-t border-[#e6ded1]">
              {memorial.timeline.map((item, index) => (
                <article
                  key={`${item.year}-${item.title}-${index}`}
                  className="grid gap-5 border-b border-[#e6ded1] py-7 md:grid-cols-[140px_1fr]"
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
      <div className="border border-[#e6ded1] bg-white py-20 text-center">
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
      <p className="text-sm font-medium" style={{ ...serifStyle, color: warmText }}>
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
        `${data.memorialDay} 추도일 알림 신청이 저장되었습니다.`
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
      setMessage("휴대폰 번호를 입력해주세요.");
      return;
    }

    if (!consent) {
      setMessage("추도일 알림을 위한 번호 저장에 동의해주세요.");
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
      className="mt-6 border-t border-[#e6ded1] pt-5"
    >
      <div className="mb-4 flex items-start gap-3">
        <Phone
          className="mt-1 h-4 w-4 shrink-0"
          style={{ color: warmGold }}
          strokeWidth={1.6}
        />
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: warmText }}
          >
            추도일 알림 받기
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: mutedText }}>
            휴대폰 번호를 남기면 {memorialDay} 추도일 안내를 받을 수
            있습니다.
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
          className="h-11 w-full border border-[#e6ded1] bg-white px-3 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#8a6a3e]"
        />
        <label className="flex items-start gap-2 text-xs leading-5" style={{ color: mutedText }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={event => setConsent(event.target.checked)}
            className="mt-1"
          />
          <span>
            추도일 알림 신청을 위해 휴대폰 번호를 저장하는 데 동의합니다.
          </span>
        </label>
        <button
          type="submit"
          disabled={subscribeMutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#1f1d1a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#33302b] disabled:cursor-not-allowed disabled:opacity-50"
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

function MemorialPortrait({
  memorial,
  portraitPhoto,
}: {
  memorial: MemorialRecord;
  portraitPhoto?: string;
}) {
  const initial = getMemorialInitial(memorial.name);

  return (
    <div className="relative mx-auto w-full max-w-[390px] lg:mx-0 lg:justify-self-end">
      <div
        className="absolute -right-4 -top-4 h-full w-full border"
        style={{ borderColor: warmGold, opacity: 0.3 }}
      />
      <div
        className="absolute -bottom-4 -left-4 h-full w-full border"
        style={{ borderColor: warmGold, opacity: 0.16 }}
      />
      <div
        className="relative overflow-hidden border border-[#e6ded1] bg-white"
        style={{ boxShadow: "0 22px 70px rgba(31, 29, 26, 0.08)" }}
      >
        {portraitPhoto ? (
          <>
            <img
              src={toImgUrl(portraitPhoto)}
              alt={`${memorial.name} 사진`}
              className="aspect-[4/5] w-full object-cover"
              style={{ filter: memorialPhotoFilter }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#7a5428]/85 to-transparent px-5 py-5 text-center">
              <p className="text-xs italic text-white" style={serifStyle}>
                {memorial.birthDate} - {memorial.deathDate}
              </p>
            </div>
          </>
        ) : (
          <div className="relative flex aspect-[4/5] flex-col justify-between p-8 text-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 30%, rgba(191,147,74,0.08), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.86), rgba(250,249,247,0.95))",
              }}
            />
            <div className="relative">
              <p
                className="text-[11px] font-medium uppercase tracking-[0.28em]"
                style={{ color: warmGold }}
              >
                In Memoriam
              </p>
            </div>
            <div className="relative">
              <div
                className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-[#e6ded1] bg-white text-6xl font-light md:h-40 md:w-40 md:text-7xl"
                style={{ ...serifStyle, color: warmGold }}
              >
                {initial}
              </div>
              <p
                className="mt-8 text-3xl font-light"
                style={{ ...serifStyle, color: warmText }}
              >
                {memorial.name}
              </p>
              <p className="mt-3 text-sm" style={{ color: mutedText }}>
                {memorial.role}
              </p>
            </div>
            <div className="relative">
              <p
                className="text-sm font-light"
                style={{ ...serifStyle, color: warmText }}
              >
                {memorial.birthDate} - {memorial.deathDate}
              </p>
              <div
                className="mx-auto mt-5 h-px w-16"
                style={{ background: warmGold, opacity: 0.55 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
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

function GoldDust() {
  const dots = [
    { left: "8%", top: "18%", size: 3, opacity: 0.07 },
    { left: "16%", top: "72%", size: 2, opacity: 0.06 },
    { left: "28%", top: "12%", size: 4, opacity: 0.05 },
    { left: "42%", top: "82%", size: 3, opacity: 0.06 },
    { left: "57%", top: "20%", size: 2, opacity: 0.07 },
    { left: "70%", top: "70%", size: 4, opacity: 0.04 },
    { left: "84%", top: "28%", size: 3, opacity: 0.06 },
    { left: "91%", top: "78%", size: 2, opacity: 0.05 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map(dot => (
        <span
          key={`${dot.left}-${dot.top}`}
          className="absolute rounded-full"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            background: warmGold,
            opacity: dot.opacity,
          }}
        />
      ))}
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

function splitParagraphs(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [value];
}

function getMemorialInitial(name: string) {
  const cleaned = name.replace(/^(고|故)\s*/, "").trim();
  return cleaned.charAt(0) || "소";
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
