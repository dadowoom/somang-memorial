import InlineEditText from "@/components/InlineEditText";
import Footer from "@/components/Footer";
import MemorialBookSection from "@/components/memorial/MemorialBookSection";
import MemorialGallerySection from "@/components/memorial/MemorialGallerySection";
import MemorialLettersSection from "@/components/memorial/MemorialLettersSection";
import MemorialVideoSection from "@/components/memorial/MemorialVideoSection";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toImgUrl } from "@/lib/imageUrl";
import { getNarrativeFontSize, normalizeTextDisplaySize } from "@/lib/textDisplay";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Church,
  Images,
  LockKeyhole,
  Video,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRoute } from "wouter";

type ArchiveMemorial = {
  id: number;
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  summary: string;
  summaryDisplaySize?: string | null;
  story: string;
  storyDisplaySize?: string | null;
  verse: string | null;
  verseRef: string | null;
  visibility: string;
};

type ArchivePhoto = {
  id: number;
  photoUrl: string;
  caption: string | null;
  year: string | null;
  isRepresentative: number;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const warmGold = "oklch(0.50 0.07 72)";
const warmText = "oklch(0.25 0.04 50)";
const mutedText = "oklch(0.42 0.02 55)";
const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";
const getMemorialAccessStorageKey = (slug: string) =>
  `somang.memorialAccess.${slug}`;
const readStoredAccessToken = (slug: string) => {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(getMemorialAccessStorageKey(slug)) || "";
};

export default function MemorialArchivePage() {
  const [, params] = useRoute<{ slug: string }>("/memorial/:slug/archive");
  const slug = params?.slug ?? "";
  const [accessToken, setAccessToken] = useState(() =>
    readStoredAccessToken(slug)
  );
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );

  useEffect(() => {
    setAccessToken(readStoredAccessToken(slug));
  }, [slug]);

  const memorial = memorialQuery.data as ArchiveMemorial | undefined;
  const photosQuery = trpc.gallery.listByMemorial.useQuery(
    { memorialId: memorial?.id ?? 0 },
    { enabled: Boolean(memorial?.id) }
  );
  const photos = (photosQuery.data ?? []) as ArchivePhoto[];
  const heroPhoto =
    photos.find(photo => photo.isRepresentative === 1)?.photoUrl ??
    photos[0]?.photoUrl ??
    getFallbackPortrait(memorial);

  const updateMemorial = trpc.memorial.update.useMutation({
    onSuccess: () => utils.memorial.bySlug.invalidate({ slug }),
  });

  const saveField = (
    field: keyof Pick<ArchiveMemorial, "name" | "role" | "summary" | "story">
  ) => {
    return (value: string) => {
      if (!memorial) return;
      return updateMemorial.mutateAsync({ id: memorial.id, [field]: value });
    };
  };

  const saveSize = (field: "summaryDisplaySize" | "storyDisplaySize") => {
    return (value: "auto" | "small" | "normal" | "large") => {
      if (!memorial) return;
      return updateMemorial.mutateAsync({ id: memorial.id, [field]: value });
    };
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden text-[#121212]"
      style={{ background: "#ffffff" }}
    >
      <Navbar />

      <main className="pt-16">
        {memorialQuery.isLoading ? (
          <StateBlock text="기념관을 불러오고 있습니다." />
        ) : memorialQuery.isError || !memorial ? (
          <StateBlock text="기념관을 찾을 수 없습니다." />
        ) : (
          <>
            <section
              className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #ffffff 0%, #fbfaf8 100%)",
              }}
            >
              <GoldDust />

              <div className="container relative z-10 py-12 md:py-20">
                <Link href={`/memorial/${memorial.slug}`}>
                  <button className="mb-10 inline-flex h-10 items-center gap-2 border border-[#e6ded1] bg-white px-4 text-sm text-[#4f4638] transition-colors hover:bg-[#faf9f7]">
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
                    추모관으로 돌아가기
                  </button>
                </Link>

                <div className="grid min-w-0 items-center gap-12 md:grid-cols-2 md:gap-20">
                  <div className="min-w-0">
                    <div className="mb-8 flex items-center gap-3">
                      <span className="h-px w-8" style={{ background: warmGold }} />
                      <p
                        className="text-[11px] font-medium uppercase tracking-[0.28em]"
                        style={{ color: warmGold }}
                      >
                        소망 만들기 · 개인 기념관
                      </p>
                    </div>

                    <h1
                      className="break-words text-5xl font-light leading-tight md:text-6xl lg:text-7xl"
                      style={{ ...serifStyle, color: warmText }}
                    >
                      <InlineEditText
                        value={memorial.name}
                        isAdmin={isAdmin}
                        onSave={saveField("name")}
                      />
                    </h1>
                    <p
                      className="mt-4 text-xl font-light"
                      style={{ ...serifStyle, color: warmGold }}
                    >
                      <InlineEditText
                        value={memorial.role}
                        isAdmin={isAdmin}
                        onSave={saveField("role")}
                      />
                    </p>
                    <p className="mt-2 text-sm" style={{ color: mutedText }}>
                      {memorial.church} 가족 기록관
                    </p>

                    <div className="my-8 h-px w-16" style={{ background: warmGold }} />

                    <div
                      className="max-w-2xl break-words font-light leading-8"
                      style={{
                        ...serifStyle,
                        color: "oklch(0.34 0.04 50)",
                        fontSize: getNarrativeFontSize(
                          memorial.summary,
                          normalizeTextDisplaySize(memorial.summaryDisplaySize)
                        ),
                      }}
                    >
                      <InlineEditText
                        value={memorial.summary}
                        isAdmin={isAdmin}
                        onSave={saveField("summary")}
                        textSize={normalizeTextDisplaySize(
                          memorial.summaryDisplaySize
                        )}
                        onTextSizeSave={saveSize("summaryDisplaySize")}
                        multiline
                        rows={3}
                      />
                    </div>

                    <div className="mt-10 grid max-w-xl grid-cols-1 gap-px overflow-hidden border border-[#e6ded1] bg-[#e6ded1] sm:grid-cols-3">
                      <ArchiveFact icon={<CalendarDays className="h-4 w-4" />} label="출생" value={memorial.birthDate} />
                      <ArchiveFact icon={<CalendarDays className="h-4 w-4" />} label="소천" value={memorial.deathDate} />
                      <ArchiveFact icon={<Church className="h-4 w-4" />} label="교회" value={memorial.church} />
                    </div>

                    <div className="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <a
                        href="#gallery"
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap bg-[#1f1d1a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#33302b]"
                      >
                        <Images className="h-4 w-4" strokeWidth={1.7} />
                        사진첩 보기
                      </a>
                      <a
                        href="#video"
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap border border-[#1f1d1a] bg-white px-4 text-sm font-medium text-[#1f1d1a] transition-colors hover:bg-[#faf9f7]"
                      >
                        <Video className="h-4 w-4" strokeWidth={1.7} />
                        영상 기록
                      </a>
                      <Link href={`/memorial/${memorial.slug}/family`}>
                        <span className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap border border-[#1f1d1a] bg-white px-4 text-sm font-medium text-[#1f1d1a] transition-colors hover:bg-[#faf9f7]">
                          <LockKeyhole className="h-4 w-4" strokeWidth={1.7} />
                          가족관
                        </span>
                      </Link>
                      <a
                        href="#book"
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap border border-[#e6ded1] bg-white px-4 text-sm font-medium text-[#4f4638] transition-colors hover:bg-[#faf9f7]"
                      >
                        <BookOpenText className="h-4 w-4" strokeWidth={1.7} />
                        책장과 연표
                      </a>
                    </div>
                  </div>

                  <div className="relative mx-auto w-full max-w-[390px] md:justify-self-end">
                    <div
                      className="absolute -right-4 -top-4 h-full w-full border"
                      style={{ borderColor: warmGold, opacity: 0.3 }}
                    />
                    <div
                      className="absolute -bottom-4 -left-4 h-full w-full border"
                      style={{ borderColor: warmGold, opacity: 0.16 }}
                    />
                    <div className="relative overflow-hidden bg-white shadow-[0_22px_70px_rgba(31,29,26,0.08)]">
                      {heroPhoto ? (
                        <img
                          src={toImgUrl(heroPhoto)}
                          alt={`${memorial.name} 사진`}
                          className="aspect-[4/5] w-full object-cover"
                          style={{ filter: memorialPhotoFilter }}
                        />
                      ) : (
                        <div
                          className="flex aspect-[4/5] items-center justify-center text-7xl font-light"
                          style={{ ...serifStyle, color: warmGold }}
                        >
                          {memorial.name.slice(0, 1)}
                        </div>
                      )}
                      {memorial.verse && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#7a5428]/85 to-transparent px-5 py-4">
                          <p
                            className="text-center text-xs italic text-white"
                            style={serifStyle}
                          >
                            "{memorial.verse.slice(0, 32)}..."
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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

            <section className="py-20 md:py-28">
              <div className="container">
                <SectionHeader
                  eyebrow="Faith Story"
                  title="신앙의 이야기"
                  description="가족이 남긴 기억과 신앙의 고백을 조용히 담았습니다."
                />

                <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-center">
                  <div className="relative overflow-hidden border border-[#e6ded1] bg-white p-9 text-center md:p-12">
                    <GoldDust />
                    <div className="relative z-10">
                      <div
                        className="mb-4 text-5xl font-light"
                        style={{
                          color: warmGold,
                          fontFamily: "Georgia, serif",
                          lineHeight: 1,
                          opacity: 0.65,
                        }}
                      >
                        "
                      </div>
                      <p
                        className="text-lg font-light leading-9"
                        style={{ ...serifStyle, color: warmText }}
                      >
                        {memorial.verse || memorial.summary}
                      </p>
                      {memorial.verseRef && (
                        <p
                          className="mt-6 text-xs uppercase tracking-[0.22em]"
                          style={{ color: warmGold }}
                        >
                          {memorial.verseRef}
                        </p>
                      )}
                    </div>
                  </div>

                  <article>
                    <div className="mb-6 h-px w-10" style={{ background: warmGold }} />
                    <h2
                      className="text-2xl font-light"
                      style={{ ...serifStyle, color: warmText }}
                    >
                      기억으로 남은 삶
                    </h2>
                    <div
                      className="mt-6 whitespace-pre-wrap break-words font-light leading-8"
                      style={{
                        color: "oklch(0.4 0.04 50)",
                        fontSize: getNarrativeFontSize(
                          memorial.story,
                          normalizeTextDisplaySize(memorial.storyDisplaySize)
                        ),
                      }}
                    >
                      <InlineEditText
                        value={memorial.story}
                        isAdmin={isAdmin}
                        onSave={saveField("story")}
                        textSize={normalizeTextDisplaySize(
                          memorial.storyDisplaySize
                        )}
                        onTextSizeSave={saveSize("storyDisplaySize")}
                        multiline
                        rows={8}
                      />
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <div id="gallery">
              <MemorialGallerySection
                memorialId={memorial.id}
                isAdmin={isAdmin}
              />
            </div>
            <div id="video">
              <MemorialVideoSection
                memorialId={memorial.id}
                memorialName={memorial.name}
                churchName={memorial.church}
                coverImageUrl={heroPhoto}
                isAdmin={isAdmin}
              />
            </div>
            <div id="book">
              <MemorialBookSection
                memorialId={memorial.id}
                isAdmin={isAdmin}
              />
            </div>
            <MemorialLettersSection
              memorialSlug={memorial.slug}
              memorialName={memorial.name}
              accessToken={accessToken || undefined}
              isPrivate={memorial.visibility === "private"}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ArchiveFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p
        className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]"
        style={{ color: warmGold }}
      >
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium" style={{ ...serifStyle, color: warmText }}>
        {value || "-"}
      </p>
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
        <span className="h-px w-10" style={{ background: warmGold, opacity: 0.55 }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: warmGold }} />
        <span className="h-px w-10" style={{ background: warmGold, opacity: 0.55 }} />
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

function getFallbackPortrait(memorial?: ArchiveMemorial) {
  if (!memorial) return null;
  if (memorial.slug === "kim-yohan-elder") {
    return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=1000&fit=crop&auto=format&q=80";
  }
  if (memorial.role.includes("권사") || memorial.name.includes("순자")) {
    return "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_woman-VLyrQ8BXGGoAo339g3C8yL.webp";
  }
  return "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_man-EoYUBTXnk59Sfrj2gmtSED.webp";
}

function StateBlock({ text }: { text: string }) {
  return (
    <section className="container py-20">
      <div className="border border-[#e6ded1] bg-white py-20 text-center">
        <p className="text-sm text-[#7a674a]">{text}</p>
      </div>
    </section>
  );
}
