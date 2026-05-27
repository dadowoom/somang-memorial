import { toImgUrl } from "@/lib/imageUrl";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Image as ImageIcon,
  LockKeyhole,
  Play,
  Search,
  Send,
  Video,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

type KioskMemorialRecord = {
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
  memorialDay: string | null;
  visibility: string;
  timeline: TimelineItem[];
};

type MemorialPhoto = {
  id: number;
  photoUrl: string;
  caption: string | null;
  year: string | null;
  isRepresentative: number;
};

type MemorialVideo = {
  id: number;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  isVisible: number;
};

type MemorialBook = {
  id: number;
  title: string;
  subtitle: string | null;
  publishedYear: string | null;
  coverPhotoUrl: string | null;
  pages: Array<{
    id: number;
    title: string | null;
    content: string | null;
    photoUrl: string | null;
    dateYear: number | null;
    dateMonth: number | null;
    dateDay: number | null;
  }>;
};

type MemorialLetter = {
  id: number;
  author: string;
  content: string;
  createdAt: string | Date;
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

type FamilyRoom = {
  memorialName: string;
  memorialRole: string;
  title: string;
  intro: string;
  notes: Array<{
    title: string;
    body: string;
  }>;
};

type FamilyRoomStatus = {
  enabled: boolean;
  memorialName: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const muted = "#64615d";
const line = "#dedbd5";
const accessStorageKey = (slug: string) => `somang.memorialAccess.${slug}`;

function readAccessToken(slug: string) {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(accessStorageKey(slug)) || "";
}

export default function KioskMemorial() {
  const [, params] = useRoute<{ slug: string }>("/kiosk/memorial/:slug");
  const slug = params?.slug ?? "";
  const [, setLocation] = useLocation();
  const [accessToken, setAccessToken] = useState(() => readAccessToken(slug));
  const [selectedPhoto, setSelectedPhoto] = useState<MemorialPhoto | null>(
    null
  );

  useEffect(() => {
    setAccessToken(readAccessToken(slug));
    window.scrollTo({ top: 0, left: 0 });
  }, [slug]);

  const accessStatusQuery = trpc.memorial.accessStatus.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );
  const memorial = memorialQuery.data as KioskMemorialRecord | undefined;
  const isLocked = memorialQuery.error?.data?.code === "FORBIDDEN";

  const photosQuery = trpc.gallery.listByMemorial.useQuery(
    { memorialId: memorial?.id ?? 0 },
    { enabled: Boolean(memorial?.id) }
  );
  const videosQuery = trpc.video.listByMemorial.useQuery(
    { memorialId: memorial?.id ?? 0 },
    { enabled: Boolean(memorial?.id) }
  );
  const booksQuery = trpc.book.listByMemorial.useQuery(
    { memorialId: memorial?.id ?? 0 },
    { enabled: Boolean(memorial?.id) }
  );

  const photos = (photosQuery.data ?? []) as MemorialPhoto[];
  const videos = (videosQuery.data ?? []) as MemorialVideo[];
  const books = (booksQuery.data ?? []) as MemorialBook[];
  const portraitPhoto =
    photos.find(photo => photo.isRepresentative === 1) ?? photos[0] ?? null;

  return (
    <main className="min-h-[100dvh] bg-white text-[#121212]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[720px] bg-white">
        <KioskMemorialHeader onBack={() => setLocation("/kiosk")} />

        {memorialQuery.isLoading ? (
          <KioskState>추모관을 불러오고 있습니다.</KioskState>
        ) : isLocked ? (
          <KioskMemorialGate
            slug={slug}
            status={accessStatusQuery.data as AccessStatus | undefined}
            onBack={() => setLocation("/kiosk")}
            onUnlocked={token => {
              sessionStorage.setItem(accessStorageKey(slug), token);
              setAccessToken(token);
            }}
          />
        ) : memorialQuery.isError || !memorial ? (
          <KioskState>추모관을 찾을 수 없습니다.</KioskState>
        ) : (
          <>
            <KioskMemorialContent
              memorial={memorial}
              photos={photos}
              videos={videos}
              books={books}
              portraitPhoto={portraitPhoto}
              accessToken={accessToken || undefined}
              onPhoto={setSelectedPhoto}
            />
          </>
        )}
      </div>

      {selectedPhoto && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-6"
          onClick={() => setSelectedPhoto(null)}
          aria-label="사진 크게 보기 닫기"
        >
          <img
            src={toImgUrl(selectedPhoto.photoUrl)}
            alt={selectedPhoto.caption || "추억 사진"}
            className="max-h-full max-w-full object-contain"
          />
          <span className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center border border-white/35 text-white">
            <X className="h-6 w-6" />
          </span>
        </button>
      )}
    </main>
  );
}

function KioskMemorialHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e8e5df] bg-white/96 px-8 py-6 backdrop-blur">
      <div className="flex items-center justify-between gap-5">
        <button type="button" onClick={onBack} className="text-left">
          <span className="block text-[24px] leading-tight" style={serifStyle}>
            소망이 있는 곳
          </span>
          <span className="mt-1 block text-sm text-[#777]">
            키오스크 추모관
          </span>
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 items-center gap-2 border border-[#d9d6d0] px-4 text-sm font-medium text-[#343434]"
        >
          <Search className="h-4 w-4" />
          검색
        </button>
      </div>
    </header>
  );
}

function KioskMemorialContent({
  memorial,
  photos,
  videos,
  books,
  portraitPhoto,
  accessToken,
  onPhoto,
}: {
  memorial: KioskMemorialRecord;
  photos: MemorialPhoto[];
  videos: MemorialVideo[];
  books: MemorialBook[];
  portraitPhoto: MemorialPhoto | null;
  accessToken?: string;
  onPhoto: (photo: MemorialPhoto) => void;
}) {
  const storyParagraphs = useMemo(
    () => splitParagraphs(memorial.story),
    [memorial.story]
  );

  const navItems = [
    { id: "story", label: "삶" },
    { id: "gallery", label: "사진" },
    { id: "video", label: "영상" },
    { id: "book", label: "기록" },
    { id: "family", label: "가족관" },
    { id: "letters", label: "편지" },
  ];

  return (
    <>
      <section className="px-8 pb-10 pt-8">
        <div>
          <p className="mb-4 text-[12px] font-medium tracking-[0.26em] text-[#777]">
            SOMANG MEMORIAL
          </p>
          <h1
            className="text-[54px] font-normal leading-[1.08]"
            style={serifStyle}
          >
            {memorial.name}
          </h1>
          <p className="mt-3 text-[24px]" style={serifStyle}>
            {memorial.role}
          </p>
          <p className="mt-3 text-base leading-7 text-[#64615d]">
            {memorial.birthDate} - {memorial.deathDate} · {memorial.church}
          </p>
          <p className="mt-7 text-[19px] leading-9 text-[#34312d]">
            {memorial.summary}
          </p>
        </div>

        <div className="mt-8 overflow-hidden border border-[#dedbd5] bg-[#f8f7f4]">
          {portraitPhoto ? (
            <img
              src={toImgUrl(portraitPhoto.photoUrl)}
              alt={`${memorial.name} 사진`}
              className="h-[360px] w-full object-cover object-center grayscale"
            />
          ) : (
            <div
              className="flex h-[260px] items-center justify-center text-[88px]"
              style={serifStyle}
            >
              {memorial.name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-3 border border-[#dedbd5]">
          <Fact label="출생" value={memorial.birthDate} />
          <Fact label="소천" value={memorial.deathDate} />
          <Fact label="교회" value={memorial.church} />
        </div>

        <div className="mt-7 grid grid-cols-3 gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="h-14 border border-[#d9d6d0] text-base font-medium active:bg-[#f4f2ed]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <KioskSection id="story" eyebrow="Story" title="삶과 신앙">
        {memorial.verse && (
          <article className="border border-[#dedbd5] p-6">
            <p className="text-[22px] leading-10" style={serifStyle}>
              {memorial.verse}
            </p>
            {memorial.verseRef && (
              <p className="mt-4 text-sm text-[#7a643e]">
                {memorial.verseRef}
              </p>
            )}
          </article>
        )}

        <article className="mt-4 border border-[#dedbd5] p-6">
          <p className="mb-4 text-sm font-medium tracking-[0.22em] text-[#777]">
            기억으로 남은 삶
          </p>
          <div className="space-y-5">
            {storyParagraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`} className="text-base leading-8 text-[#4f4c48]">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <article className="mt-4 border border-[#dedbd5] p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5" />
            <p className="text-lg font-medium">추도일</p>
          </div>
          <p className="mt-4 text-base text-[#64615d]">
            {formatMemorialDay(memorial.memorialDay)}
          </p>
        </article>
      </KioskSection>

      <KioskSection id="gallery" eyebrow="Gallery" title="사진첩">
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.slice(0, 8).map(photo => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onPhoto(photo)}
                className="overflow-hidden border border-[#dedbd5] bg-white text-left"
              >
                <img
                  src={toImgUrl(photo.photoUrl)}
                  alt={photo.caption || "추억 사진"}
                  className="aspect-square w-full object-cover grayscale"
                />
                {(photo.caption || photo.year) && (
                  <span className="block px-3 py-3 text-sm leading-6 text-[#64615d]">
                    {photo.year ? `${photo.year} · ` : ""}
                    {photo.caption || "추억 사진"}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <EmptyBox icon={<ImageIcon className="h-5 w-5" />} text="등록된 사진이 없습니다." />
        )}
      </KioskSection>

      <KioskSection id="video" eyebrow="Video" title="영상 기록">
        <div className="overflow-hidden border border-[#dedbd5]">
          <div className="relative aspect-video bg-[#1f1d1a]">
            {portraitPhoto ? (
              <img
                src={toImgUrl(portraitPhoto.photoUrl)}
                alt={`${memorial.name} 영상 이미지`}
                className="h-full w-full object-cover grayscale opacity-72"
              />
            ) : null}
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-20 w-20 items-center justify-center border border-white/70 bg-white/90 text-[#1f1d1a]">
                <Play className="ml-1 h-9 w-9 fill-current" />
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <Video className="h-5 w-5" />
              <p className="text-lg font-medium">영상으로 남은 기억</p>
            </div>
            {videos.length ? (
              <div className="space-y-3">
                {videos.slice(0, 4).map(video => (
                  <p key={video.id} className="border-t border-[#dedbd5] pt-3 text-base text-[#4f4c48]">
                    {video.title}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-base leading-8 text-[#64615d]">
                영상 기록이 있는 공간이라는 느낌만 조용히 보여줍니다.
              </p>
            )}
          </div>
        </div>
      </KioskSection>

      <KioskSection id="book" eyebrow="Archive" title="책장과 연표">
        {memorial.timeline.length ? (
          <div className="border-t border-[#dedbd5]">
            {memorial.timeline.slice(0, 6).map((item, index) => (
              <article
                key={`${item.year}-${item.title}-${index}`}
                className="border-b border-[#dedbd5] py-5"
              >
                <p className="text-sm text-[#7a643e]">{item.year || "기록"}</p>
                <h3 className="mt-2 text-[24px]" style={serifStyle}>
                  {item.title || "생애 기록"}
                </h3>
                {item.description && (
                  <p className="mt-3 text-base leading-8 text-[#64615d]">
                    {item.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : null}

        {books.length ? (
          <div className="mt-5 space-y-3">
            {books.slice(0, 3).map(book => (
              <article key={book.id} className="border border-[#dedbd5] p-5">
                <p className="text-sm text-[#7a643e]">
                  {book.publishedYear || "기록"}
                </p>
                <h3 className="mt-2 text-[24px]" style={serifStyle}>
                  {book.title}
                </h3>
                {book.subtitle && (
                  <p className="mt-2 text-base text-[#64615d]">{book.subtitle}</p>
                )}
                {book.pages[0]?.content && (
                  <p className="mt-4 line-clamp-3 text-base leading-8 text-[#64615d]">
                    {book.pages[0].content}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : !memorial.timeline.length ? (
          <EmptyBox icon={<BookOpenText className="h-5 w-5" />} text="등록된 기록이 없습니다." />
        ) : null}
      </KioskSection>

      <KioskFamilySection slug={memorial.slug} />

      <KioskLettersSection
        memorialSlug={memorial.slug}
        memorialName={memorial.name}
        accessToken={accessToken}
        isPrivate={memorial.visibility === "private"}
      />

      <div
        aria-hidden="true"
        className="h-[52vh] border-t border-[#dedbd5]"
      />
    </>
  );
}

function KioskMemorialGate({
  slug,
  status,
  onBack,
  onUnlocked,
}: {
  slug: string;
  status?: AccessStatus;
  onBack: () => void;
  onUnlocked: (token: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const verifyAccess = trpc.memorial.verifyAccess.useMutation();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    try {
      const result = await verifyAccess.mutateAsync({ slug, password });
      if (result.accessToken) onUnlocked(result.accessToken);
    } catch {
      setMessage("비밀번호가 맞지 않습니다.");
    }
  };

  return (
    <section className="px-8 py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex h-12 items-center gap-2 border border-[#dedbd5] px-4 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        검색으로
      </button>

      <form onSubmit={submit} className="border border-[#dedbd5] p-7">
        <LockKeyhole className="mb-6 h-7 w-7" />
        <p className="mb-3 text-sm font-medium tracking-[0.24em] text-[#777]">
          PRIVATE MEMORIAL
        </p>
        <h1 className="text-[44px] leading-tight" style={serifStyle}>
          {status?.name || "비공개 추모관"}
        </h1>
        {status && (
          <p className="mt-4 text-base leading-7 text-[#64615d]">
            {status.birthDate} - {status.deathDate} · {status.church} ·{" "}
            {status.role}
          </p>
        )}
        <input
          type="password"
          value={password}
          onChange={event => {
            setPassword(event.target.value);
            setMessage("");
          }}
          placeholder="비밀번호"
          className="mt-8 h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#aaa]"
          autoFocus
        />
        {message && <p className="mt-4 text-sm text-[#9f2a2a]">{message}</p>}
        <button
          type="submit"
          disabled={verifyAccess.isPending}
          className="mt-5 h-16 w-full bg-[#18181b] text-lg font-medium text-white disabled:opacity-50"
        >
          {verifyAccess.isPending ? "확인 중" : "입장하기"}
        </button>
      </form>
    </section>
  );
}

function KioskFamilySection({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<FamilyRoom | null>(null);
  const statusQuery = trpc.familyRoom.status.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(slug) }
  );
  const verifyFamily = trpc.familyRoom.verify.useMutation({
    onSuccess: data => {
      setRoom(data as FamilyRoom);
      setPassword("");
      setMessage("");
    },
    onError: error => setMessage(error.message),
  });
  const status = statusQuery.data as FamilyRoomStatus | undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }
    verifyFamily.mutate({ memorialSlug: slug, password: password.trim() });
  };

  return (
    <KioskSection id="family" eyebrow="Family" title="가족관">
      {statusQuery.isLoading ? (
        <EmptyBox icon={<LockKeyhole className="h-5 w-5" />} text="가족관을 확인하고 있습니다." />
      ) : !status?.enabled ? (
        <EmptyBox icon={<LockKeyhole className="h-5 w-5" />} text="아직 준비된 가족관이 없습니다." />
      ) : room ? (
        <div className="space-y-4">
          <article className="border border-[#dedbd5] p-6">
            <p className="text-sm text-[#7a643e]">가족관 입장 완료</p>
            <h3 className="mt-3 text-[28px]" style={serifStyle}>
              {room.title}
            </h3>
            <p className="mt-4 text-base leading-8 text-[#64615d]">
              {room.intro}
            </p>
          </article>
          {room.notes.map(note => (
            <article key={note.title} className="border border-[#dedbd5] p-5">
              <h4 className="text-[22px]" style={serifStyle}>
                {note.title}
              </h4>
              <p className="mt-3 text-base leading-8 text-[#64615d]">
                {note.body}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="border border-[#dedbd5] p-6">
          <p className="text-base leading-8 text-[#64615d]">
            가족에게만 열린 공간입니다. 전달받은 비밀번호를 입력해 주세요.
          </p>
          <input
            type="password"
            value={password}
            onChange={event => {
              setPassword(event.target.value);
              setMessage("");
            }}
            placeholder="가족관 비밀번호"
            className="mt-6 h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#aaa]"
          />
          {message && <p className="mt-3 text-sm text-[#9f2a2a]">{message}</p>}
          <button
            type="submit"
            disabled={verifyFamily.isPending}
            className="mt-5 h-16 w-full bg-[#18181b] text-lg font-medium text-white disabled:opacity-50"
          >
            {verifyFamily.isPending ? "확인 중" : "가족관 입장"}
          </button>
        </form>
      )}
    </KioskSection>
  );
}

function KioskLettersSection({
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
  const queryInput = { memorialSlug, accessToken: accessToken || undefined };
  const lettersQuery = trpc.letter.byMemorial.useQuery(queryInput);
  const createLetter = trpc.letter.create.useMutation({
    onSuccess: async () => {
      setAuthor("");
      setContent("");
      setMessage("편지가 남겨졌습니다.");
      await Promise.all([
        utils.letter.byMemorial.invalidate(queryInput),
        utils.letter.recent.invalidate(),
      ]);
    },
    onError: error => setMessage(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!author.trim() || !content.trim()) {
      setMessage("작성자와 내용을 입력해 주세요.");
      return;
    }
    setMessage("");
    createLetter.mutate({
      memorialSlug,
      accessToken: accessToken || undefined,
      author: author.trim(),
      content: content.trim(),
    });
  };

  const letters = (lettersQuery.data ?? []) as MemorialLetter[];

  return (
    <KioskSection id="letters" eyebrow="Letters" title="하늘로 보내는 편지">
      <form onSubmit={submit} className="border border-[#dedbd5]">
        <div className="border-b border-[#dedbd5] p-5">
          <p className="text-sm text-[#7a643e]">To {memorialName}</p>
          <input
            value={author}
            onChange={event => {
              setAuthor(event.target.value);
              setMessage("");
            }}
            placeholder="작성자"
            className="mt-4 h-12 w-full border-b border-[#dedbd5] bg-transparent text-xl outline-none placeholder:text-[#aaa]"
          />
          <textarea
            value={content}
            onChange={event => {
              setContent(event.target.value);
              setMessage("");
            }}
            placeholder="전하고 싶은 마음을 남겨주세요."
            rows={4}
            className="mt-5 w-full resize-none bg-transparent text-lg leading-8 outline-none placeholder:text-[#aaa]"
          />
        </div>
        <div className="p-5">
          <p className="mb-4 text-sm leading-6 text-[#64615d]">
            {message ||
              (isPrivate
                ? "비공개 추모관 안에서만 보관됩니다."
                : "남겨진 편지는 하늘로 보내는 편지에 함께 모입니다.")}
          </p>
          <button
            type="submit"
            disabled={createLetter.isPending}
            className="flex h-14 w-full items-center justify-center gap-2 bg-[#18181b] text-base font-medium text-white disabled:opacity-50"
          >
            {createLetter.isPending ? "남기는 중" : "편지 남기기"}
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-[#dedbd5]">
        {lettersQuery.isLoading ? (
          <p className="border-b border-[#dedbd5] py-5 text-base text-[#64615d]">
            편지를 불러오고 있습니다.
          </p>
        ) : letters.length ? (
          letters.slice(0, 4).map(letter => (
            <article key={letter.id} className="border-b border-[#dedbd5] py-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-base font-medium">From {letter.author}</p>
                <p className="text-sm text-[#777]">{formatDate(letter.createdAt)}</p>
              </div>
              <p className="mt-3 whitespace-pre-line break-words text-base leading-8 text-[#64615d]">
                {letter.content}
              </p>
            </article>
          ))
        ) : (
          <p className="border-b border-[#dedbd5] py-5 text-base text-[#64615d]">
            아직 남겨진 편지가 없습니다.
          </p>
        )}
      </div>
    </KioskSection>
  );
}

function KioskSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-[#dedbd5] px-8 py-10"
    >
      <p className="mb-3 text-[12px] font-medium tracking-[0.26em] text-[#777]">
        {eyebrow}
      </p>
      <h2 className="mb-7 text-[36px] font-normal leading-tight" style={serifStyle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[#dedbd5] px-4 py-4 last:border-r-0">
      <p className="text-[12px] font-medium tracking-[0.18em] text-[#777]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#34312d]">{value || "-"}</p>
    </div>
  );
}

function EmptyBox({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-[150px] items-center justify-center gap-3 border border-[#dedbd5] text-base text-[#64615d]">
      {icon}
      {text}
    </div>
  );
}

function KioskState({ children }: { children: ReactNode }) {
  return (
    <section className="px-8 py-16">
      <div className="border border-[#dedbd5] py-16 text-center text-base text-[#64615d]">
        {children}
      </div>
    </section>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}|\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function formatMemorialDay(value: string | null) {
  if (!value) return "추후 안내";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
