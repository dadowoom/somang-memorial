import InlineEditText from "@/components/InlineEditText";
import Footer from "@/components/Footer";
import MemorialBookSection from "@/components/memorial/MemorialBookSection";
import MemorialGallerySection from "@/components/memorial/MemorialGallerySection";
import MemorialLettersSection from "@/components/memorial/MemorialLettersSection";
import MemorialVideoSection from "@/components/memorial/MemorialVideoSection";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import MemorialPortrait from "@/components/memorial/MemorialPortrait";
import {
  getNarrativeFontSize,
  normalizeTextDisplaySize,
} from "@/lib/textDisplay";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Church,
  Images,
  Mail,
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
const warmGold = "#666666";
const warmText = "#171717";
const mutedText = "#626262";
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
    {
      memorialId: memorial?.id ?? 0,
      accessToken: accessToken || undefined,
    },
    { enabled: Boolean(memorial?.id) }
  );
  const photos = (photosQuery.data ?? []) as ArchivePhoto[];
  // 사진이 없으면 성함 첫 글자를 보여 준다. 전에는 외부 사이트의 낯선 사람
  // 얼굴 사진을 대신 넣었는데, 고인이 아닌 사람 사진이 영정 자리에 나오면
  // 안 된다 (2026-09-14 제거).
  const heroPhoto =
    photos.find(photo => photo.isRepresentative === 1)?.photoUrl ??
    photos[0]?.photoUrl ??
    null;

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
            <section className="memorial-hero">
              <div className="container">
                <Link href={`/memorial/${memorial.slug}`} className="memorial-back">
                  <ArrowLeft size={16} />
                  추모관으로 돌아가기
                </Link>
                <div className="memorial-hero__layout">
                  <div className="memorial-hero__copy">
                    <p className="memorial-hero__eyebrow">
                      LIFE ARCHIVE · 사진과 신앙의 기록
                    </p>
                    <h1 className="memorial-hero__name" style={serifStyle}>
                      <InlineEditText
                        value={memorial.name}
                        isAdmin={isAdmin}
                        onSave={saveField("name")}
                      />
                    </h1>
                    <div className="memorial-hero__role">
                      <span>
                        <InlineEditText
                          value={memorial.role}
                          isAdmin={isAdmin}
                          onSave={saveField("role")}
                        />
                      </span>
                      <span>{memorial.church}</span>
                    </div>
                    <div
                      className="memorial-hero__summary"
                      style={{
                        fontSize: getNarrativeFontSize(
                          memorial.summary,
                          normalizeTextDisplaySize(memorial.summaryDisplaySize),
                        ),
                      }}
                    >
                      <InlineEditText
                        value={memorial.summary}
                        isAdmin={isAdmin}
                        onSave={saveField("summary")}
                        textSize={normalizeTextDisplaySize(memorial.summaryDisplaySize)}
                        onTextSizeSave={saveSize("summaryDisplaySize")}
                        multiline
                        rows={3}
                      />
                    </div>
                    <div className="memorial-facts">
                      <ArchiveFact
                        icon={<CalendarDays size={14} />}
                        label="출생"
                        value={memorial.birthDate}
                      />
                      {memorial.deathDate && (
                        <ArchiveFact
                          icon={<CalendarDays size={14} />}
                          label="소천"
                          value={memorial.deathDate}
                        />
                      )}
                      <ArchiveFact
                        icon={<Church size={14} />}
                        label="교회"
                        value={memorial.church}
                      />
                    </div>
                  </div>
                  <MemorialPortrait
                    name={memorial.name}
                    birthDate={memorial.birthDate}
                    deathDate={memorial.deathDate}
                    photo={heroPhoto}
                  />
                </div>
              </div>
            </section>
            <nav className="memorial-record-nav" aria-label="사진과 기록 메뉴">
              <div className="container memorial-record-nav__inner">
                <a href="#gallery">
                  <Images />
                  사진첩
                </a>
                <a href="#video">
                  <Video />
                  영상
                </a>
                <a href="#book">
                  <BookOpenText />
                  책장과 연표
                </a>
                <a href="#letters">
                  <Mail />
                  편지
                </a>
                <Link href={`/memorial/${memorial.slug}/family`}>
                  <LockKeyhole />
                  가족관
                </Link>
              </div>
            </nav>

            <section className="py-20 md:py-28">
              <div className="container">
                <SectionHeader
                  eyebrow="Faith Story"
                  title="신앙의 이야기"
                  description="가족이 남긴 기억과 신앙의 고백을 함께 돌아봅니다."
                />

                <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-center">
                  <div className="memorial-verse p-9 text-center md:p-12">
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
                    <div
                      className="mb-6 h-px w-10"
                      style={{ background: warmGold }}
                    />
                    <h2
                      className="text-balance break-keep text-2xl font-light [overflow-wrap:anywhere]"
                      style={{ ...serifStyle, color: warmText }}
                    >
                      기억으로 남은 삶
                    </h2>
                    <div
                      className="mt-6 whitespace-pre-wrap break-words font-light leading-8"
                      style={{
                        color: "#555555",
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

            <div className="memorial-gallery">
              <MemorialGallerySection
                memorialId={memorial.id}
                isAdmin={isAdmin}
                accessToken={accessToken || undefined}
              />
            </div>
            <div id="video">
              <MemorialVideoSection
                memorialId={memorial.id}
                memorialName={memorial.name}
                churchName={memorial.church}
                coverImageUrl={heroPhoto}
                isAdmin={isAdmin}
                accessToken={accessToken || undefined}
              />
            </div>
            <div id="book">
              <MemorialBookSection
                memorialId={memorial.id}
                isAdmin={isAdmin}
                accessToken={accessToken || undefined}
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
      <p
        className="text-sm font-medium"
        style={{ ...serifStyle, color: warmText }}
      >
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

function StateBlock({ text }: { text: string }) {
  return (
    <section className="container py-20">
      <div className="border border-[#dedede] bg-white py-20 text-center">
        <p className="text-sm text-[#666666]">{text}</p>
      </div>
    </section>
  );
}
