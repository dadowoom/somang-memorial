import { toImgUrl } from "@/lib/imageUrl";
import {
  createKioskVideoFrameState,
  KIOSK_VIDEO_IFRAME_SANDBOX,
  KIOSK_VIDEO_LOAD_TIMEOUT_MS,
  reduceKioskVideoFrameState,
} from "@/lib/kioskMedia";
import {
  getKioskErrorCode,
  getKioskPasswordErrorMessage,
  KIOSK_CONNECTION_ERROR_MESSAGE,
} from "@/lib/kioskError";
import {
  acquireKioskSubmissionLock,
  releaseKioskSubmissionLock,
} from "@/lib/kioskSubmissionLock";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
} from "@/lib/youtube";
import {
  clearBrowserKioskAccessStorage,
  kioskAccessStorageKey,
  useKioskIdleReset,
} from "@/hooks/useKioskIdleReset";
import {
  useKioskKeyboard,
  useKioskKeyboardField,
} from "@/components/kiosk/KioskKeyboard";
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  House,
  Image as ImageIcon,
  LockKeyhole,
  Play,
  RefreshCw,
  Send,
  Video,
  X,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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

type KioskPlayableVideo = Omit<MemorialVideo, "id" | "isVisible"> & {
  id: number | string;
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
  video: {
    title: string;
    description: string;
    youtubeVideoId: string;
  } | null;
  notes: Array<{
    title: string;
    body: string;
  }>;
};

type FamilyRoomStatus = {
  enabled: boolean;
  memorialName: string;
};

type KioskResourceStatus = {
  loading: boolean;
  unavailable: boolean;
  retrying: boolean;
  onRetry: () => void;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const muted = "#64615d";
const line = "#dedbd5";
const KIOSK_VIDEO_IDLE_RESET_MS = 15 * 60_000;

function readAccessToken(slug: string) {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(kioskAccessStorageKey(slug)) || "";
}

export default function KioskMemorial() {
  const [, params] = useRoute<{ slug: string }>("/kiosk/memorial/:slug");
  const slug = params?.slug ?? "";
  const [, setLocation] = useLocation();
  const { closeKeyboard, isOpen: isKeyboardOpen } = useKioskKeyboard();
  const kioskSessionActiveRef = useRef(true);
  const [accessToken, setAccessToken] = useState(() => readAccessToken(slug));
  const [selectedPhoto, setSelectedPhoto] = useState<MemorialPhoto | null>(
    null
  );
  const [selectedVideo, setSelectedVideo] = useState<KioskPlayableVideo | null>(
    null
  );
  const closePhoto = useCallback(() => setSelectedPhoto(null), []);
  const closeVideo = useCallback(() => setSelectedVideo(null), []);
  const returnToKiosk = useCallback(() => {
    kioskSessionActiveRef.current = false;
    closeKeyboard();
    clearBrowserKioskAccessStorage();
    setLocation("/kiosk", { replace: true });
  }, [closeKeyboard, setLocation]);

  useKioskIdleReset(
    returnToKiosk,
    selectedVideo ? KIOSK_VIDEO_IDLE_RESET_MS : undefined
  );

  useEffect(() => {
    kioskSessionActiveRef.current = true;
    closeKeyboard();
    setAccessToken(readAccessToken(slug));
    setSelectedPhoto(null);
    setSelectedVideo(null);
    window.scrollTo({ top: 0, left: 0 });

    return () => {
      kioskSessionActiveRef.current = false;
    };
  }, [closeKeyboard, slug]);

  const accessStatusQuery = trpc.memorial.accessStatus.useQuery(
    { slug },
    { enabled: Boolean(slug), retry: false, networkMode: "always" }
  );
  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false, networkMode: "always" }
  );
  const memorial = memorialQuery.data as KioskMemorialRecord | undefined;
  const memorialErrorCode = getKioskErrorCode(memorialQuery.error);
  const isLocked = memorialErrorCode === "FORBIDDEN";
  const isNotFound = memorialErrorCode === "NOT_FOUND";

  const photosQuery = trpc.gallery.listByMemorial.useQuery(
    {
      memorialId: memorial?.id ?? 0,
      accessToken: accessToken || undefined,
    },
    {
      enabled: Boolean(memorial?.id),
      retry: false,
      networkMode: "always",
    }
  );
  const videosQuery = trpc.video.listByMemorial.useQuery(
    {
      memorialId: memorial?.id ?? 0,
      accessToken: accessToken || undefined,
    },
    {
      enabled: Boolean(memorial?.id),
      retry: false,
      networkMode: "always",
    }
  );
  const booksQuery = trpc.book.listByMemorial.useQuery(
    {
      memorialId: memorial?.id ?? 0,
      accessToken: accessToken || undefined,
    },
    {
      enabled: Boolean(memorial?.id),
      retry: false,
      networkMode: "always",
    }
  );

  const photos = (photosQuery.data ?? []) as MemorialPhoto[];
  const videos = (videosQuery.data ?? []) as MemorialVideo[];
  const books = (booksQuery.data ?? []) as MemorialBook[];
  const portraitPhoto =
    photos.find(photo => photo.isRepresentative === 1) ?? photos[0] ?? null;

  return (
    <main className="min-h-[100dvh] bg-white text-[#121212]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[720px] bg-white pb-24">
        <KioskMemorialHeader onBack={returnToKiosk} />

        {memorialQuery.isLoading ? (
          <KioskState>추모관을 불러오고 있습니다.</KioskState>
        ) : isLocked ? (
          <KioskMemorialGate
            slug={slug}
            status={accessStatusQuery.data as AccessStatus | undefined}
            onBack={returnToKiosk}
            onUnlocked={token => {
              if (!kioskSessionActiveRef.current) return;
              sessionStorage.setItem(kioskAccessStorageKey(slug), token);
              setAccessToken(token);
            }}
          />
        ) : memorialQuery.isError || !memorial ? (
          isNotFound ? (
            <KioskState
              description="검색 화면으로 돌아가 다른 성함을 확인해 주세요."
              actionLabel="검색으로"
              actionKind="back"
              onAction={returnToKiosk}
            >
              추모관을 찾을 수 없습니다.
            </KioskState>
          ) : (
            <KioskState
              description="인터넷 연결을 확인한 뒤 다시 시도해 주세요."
              actionLabel="다시 시도"
              actionPending={memorialQuery.isFetching}
              onAction={() => void memorialQuery.refetch()}
            >
              연결이 원활하지 않습니다.
            </KioskState>
          )
        ) : (
          <>
            <KioskMemorialContent
              memorial={memorial}
              photos={photos}
              videos={videos}
              books={books}
              portraitPhoto={portraitPhoto}
              accessToken={accessToken || undefined}
              photosStatus={{
                loading: photosQuery.isLoading,
                unavailable: photosQuery.isError || photosQuery.isPaused,
                retrying: photosQuery.isFetching,
                onRetry: () => void photosQuery.refetch(),
              }}
              videosStatus={{
                loading: videosQuery.isLoading,
                unavailable: videosQuery.isError || videosQuery.isPaused,
                retrying: videosQuery.isFetching,
                onRetry: () => void videosQuery.refetch(),
              }}
              booksStatus={{
                loading: booksQuery.isLoading,
                unavailable: booksQuery.isError || booksQuery.isPaused,
                retrying: booksQuery.isFetching,
                onRetry: () => void booksQuery.refetch(),
              }}
              onPhoto={photo => {
                closeKeyboard();
                setSelectedPhoto(photo);
              }}
              onVideo={video => {
                closeKeyboard();
                setSelectedVideo(video);
              }}
            />
          </>
        )}
      </div>

      {memorial && !selectedPhoto && !selectedVideo && !isKeyboardOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto flex w-full max-w-[720px] justify-end px-6">
          <button
            type="button"
            onClick={returnToKiosk}
            className="pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full border border-[#d9d6d0] bg-white/95 px-5 text-[15px] font-medium text-[#343434] shadow-[0_8px_28px_rgba(0,0,0,0.16)] backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] active:bg-[#f4f2ed]"
            aria-label="처음으로: 키오스크 검색 화면으로 돌아가기"
          >
            <House className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            처음으로
          </button>
        </div>
      )}

      {selectedPhoto && (
        <KioskPhotoDialog photo={selectedPhoto} onClose={closePhoto} />
      )}

      {selectedVideo && (
        <KioskVideoDialog
          key={selectedVideo.id}
          video={selectedVideo}
          onClose={closeVideo}
        />
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
          <House className="h-4 w-4" />
          처음으로
        </button>
      </div>
    </header>
  );
}

function KioskLoadableImage({
  src,
  alt,
  containerClassName,
  imageClassName,
  loading = "lazy",
  loadingText = "사진을 불러오는 중입니다.",
  fallback,
  preserveRatio = false,
}: {
  src: string;
  alt: string;
  containerClassName?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  loadingText?: string;
  fallback?: ReactNode;
  preserveRatio?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    src ? "loading" : "failed"
  );

  useEffect(() => {
    setStatus(src ? "loading" : "failed");
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#f3f1ec]",
        containerClassName
      )}
      aria-busy={status === "loading"}
    >
      {status === "loading" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-[#6f6b65]"
          role="status"
        >
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>{loadingText}</span>
        </div>
      )}

      {status === "failed" &&
        (fallback ?? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#6f6b65]"
            role="status"
          >
            <ImageIcon className="h-6 w-6" />
            <span>사진을 표시할 수 없습니다.</span>
          </div>
        ))}

      {src && status === "loaded" && preserveRatio && (
        <>
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.16] grayscale"
          />
          <span
            className="absolute inset-0 bg-[#f3f1ec]/70"
            aria-hidden="true"
          />
        </>
      )}

      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
          className={cn(
            "h-full w-full",
            status === "loaded" ? "visible" : "invisible",
            imageClassName,
            preserveRatio && "relative z-10 object-contain"
          )}
        />
      )}
    </div>
  );
}

function useKioskDialog({
  onClose,
  dialogRef,
  initialFocusRef,
}: {
  onClose: () => void;
  dialogRef: { current: HTMLElement | null };
  initialFocusRef: { current: HTMLButtonElement | null };
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(element => element.getAttribute("aria-hidden") !== "true");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKey);
      previousFocus?.focus();
    };
  }, [dialogRef, initialFocusRef, onClose]);
}

function KioskPhotoDialog({
  photo,
  onClose,
}: {
  photo: MemorialPhoto;
  onClose: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const photoUrl = toImgUrl(photo.photoUrl);
  const photoTitle = photo.caption || "추억 사진";

  useKioskDialog({ onClose, dialogRef, initialFocusRef: closeButtonRef });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-photo-title"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="사진 바깥쪽을 눌러 닫기"
      />

      <section
        ref={dialogRef}
        className="relative z-10 flex h-[calc(100vh-2.5rem)] w-full max-w-[1200px] flex-col bg-[#111] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-5 border-b border-white/20 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.18em] text-white/60">PHOTO</p>
            <h2
              id="kiosk-photo-title"
              className="mt-1 truncate text-xl font-medium"
            >
              {photoTitle}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-12 shrink-0 items-center gap-2 border border-white/40 px-4 text-sm font-medium"
          >
            <X className="h-5 w-5" />
            사진 닫기
          </button>
        </div>

        <KioskLoadableImage
          key={`${photo.id}-${attempt}`}
          src={photoUrl}
          alt={photoTitle}
          loading="eager"
          loadingText="큰 사진을 불러오는 중입니다."
          containerClassName="min-h-0 flex-1 bg-black"
          imageClassName="object-contain"
          fallback={
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
              role="alert"
            >
              <ImageIcon className="h-10 w-10 text-white/65" />
              <p className="text-lg">사진을 표시할 수 없습니다.</p>
              <p className="text-sm leading-6 text-white/65">
                인터넷 연결을 확인한 뒤 다시 시도해 주세요.
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAttempt(current => current + 1)}
                  className="flex h-12 items-center gap-2 border border-white/50 px-5 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 border border-white/30 px-5 text-sm font-medium text-white/80"
                >
                  닫기
                </button>
              </div>
            </div>
          }
        />
      </section>
    </div>
  );
}

function KioskVideoDialog({
  video,
  onClose,
}: {
  video: KioskPlayableVideo;
  onClose: () => void;
}) {
  const embedUrl = getYouTubeEmbedUrl(video.youtubeVideoId, true);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [frameState, dispatchFrame] = useReducer(
    reduceKioskVideoFrameState,
    undefined,
    createKioskVideoFrameState
  );

  useEffect(() => {
    if (!embedUrl || frameState.phase !== "loading") return;

    const attempt = frameState.attempt;
    const timeout = window.setTimeout(() => {
      dispatchFrame({ type: "timed-out", attempt });
    }, KIOSK_VIDEO_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [embedUrl, frameState.attempt, frameState.phase]);

  useKioskDialog({ onClose, dialogRef, initialFocusRef: closeButtonRef });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-video-title"
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="영상 바깥쪽을 눌러 닫기"
      />

      <section
        ref={dialogRef}
        className="relative z-10 max-h-[calc(100vh-2.5rem)] w-full max-w-[980px] overflow-y-auto bg-[#111] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-5 border-b border-white/20 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.18em] text-white/60">VIDEO</p>
            <h2
              id="kiosk-video-title"
              className="mt-1 truncate text-xl font-medium"
            >
              {video.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-12 shrink-0 items-center gap-2 border border-white/40 px-4 text-sm font-medium"
          >
            <X className="h-5 w-5" />
            영상 닫기
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          {embedUrl ? (
            <iframe
              key={`${video.id}-${frameState.attempt}`}
              src={embedUrl}
              title={`${video.title} 영상`}
              className="h-full w-full border-0"
              sandbox={KIOSK_VIDEO_IFRAME_SANDBOX}
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="eager"
              onLoad={() =>
                dispatchFrame({
                  type: "responded",
                  attempt: frameState.attempt,
                })
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center px-5 text-center text-white/75">
              이 영상은 재생할 수 없습니다.
            </div>
          )}
        </div>

        <div
          className="flex min-h-16 items-center justify-between gap-4 border-t border-white/20 px-5 py-3"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-3 text-sm text-white/70">
            {frameState.phase === "loading" && embedUrl ? (
              <>
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                <span>영상을 준비하고 있습니다.</span>
              </>
            ) : frameState.phase === "slow" && embedUrl ? (
              <>
                <Video className="h-4 w-4 shrink-0" />
                <span>
                  영상 연결이 늦어지고 있습니다. 화면이 보이지 않으면 다시
                  불러와 주세요.
                </span>
              </>
            ) : embedUrl ? (
              <span>영상이 보이지 않으면 다시 불러오기를 눌러 주세요.</span>
            ) : (
              <span>등록된 영상 주소를 확인해 주세요.</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => dispatchFrame({ type: "retry" })}
            disabled={!embedUrl || frameState.phase === "loading"}
            className="flex h-12 shrink-0 items-center gap-2 border border-white/40 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RefreshCw className="h-4 w-4" />
            영상 다시 불러오기
          </button>
        </div>

        {video.description && (
          <p className="px-5 py-4 text-sm leading-6 text-white/70">
            {video.description}
          </p>
        )}
      </section>
    </div>
  );
}

function KioskMemorialContent({
  memorial,
  photos,
  videos,
  books,
  portraitPhoto,
  accessToken,
  photosStatus,
  videosStatus,
  booksStatus,
  onPhoto,
  onVideo,
}: {
  memorial: KioskMemorialRecord;
  photos: MemorialPhoto[];
  videos: MemorialVideo[];
  books: MemorialBook[];
  portraitPhoto: MemorialPhoto | null;
  accessToken?: string;
  photosStatus: KioskResourceStatus;
  videosStatus: KioskResourceStatus;
  booksStatus: KioskResourceStatus;
  onPhoto: (photo: MemorialPhoto) => void;
  onVideo: (video: KioskPlayableVideo) => void;
}) {
  const storyParagraphs = useMemo(
    () => splitParagraphs(memorial.story),
    [memorial.story]
  );
  const playableVideos = useMemo(
    () =>
      videos
        .filter(
          video =>
            video.isVisible === 1 && isValidYouTubeVideoId(video.youtubeVideoId)
        )
        .slice(0, 4),
    [videos]
  );
  const featuredVideo = playableVideos[0] ?? null;

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
          {photosStatus.loading ? (
            <div
              className="flex h-[360px] flex-col items-center justify-center gap-3 text-sm text-[#6f6b65]"
              role="status"
            >
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>대표 사진을 불러오는 중입니다.</span>
            </div>
          ) : portraitPhoto ? (
            <KioskLoadableImage
              key={`${portraitPhoto.id}-${portraitPhoto.photoUrl}`}
              src={toImgUrl(portraitPhoto.photoUrl)}
              alt={`${memorial.name} 사진`}
              loading="eager"
              loadingText="대표 사진을 불러오는 중입니다."
              containerClassName="h-[360px] w-full"
              imageClassName="grayscale"
              preserveRatio
              fallback={
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#6f6b65]"
                  role="status"
                >
                  <span className="text-[88px]" style={serifStyle}>
                    {memorial.name.slice(0, 1)}
                  </span>
                  <span className="text-sm">
                    대표 사진을 표시할 수 없습니다.
                  </span>
                </div>
              }
            />
          ) : (
            <div
              className="flex h-[360px] items-center justify-center text-[88px]"
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
              <p className="mt-4 text-sm text-[#7a643e]">{memorial.verseRef}</p>
            )}
          </article>
        )}

        <article className="mt-4 border border-[#dedbd5] p-6">
          <p className="mb-4 text-sm font-medium tracking-[0.22em] text-[#777]">
            기억으로 남은 삶
          </p>
          <div className="space-y-5">
            {storyParagraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 16)}`}
                className="text-base leading-8 text-[#4f4c48]"
              >
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
        {photosStatus.loading ? (
          <EmptyBox
            icon={<ImageIcon className="h-5 w-5" />}
            text="사진을 불러오고 있습니다."
          />
        ) : photosStatus.unavailable ? (
          <RetryBox
            text="사진을 불러오지 못했습니다."
            pending={photosStatus.retrying}
            onRetry={photosStatus.onRetry}
          />
        ) : photos.length ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.slice(0, 8).map(photo => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onPhoto(photo)}
                className="overflow-hidden border border-[#dedbd5] bg-white text-left"
                aria-label={`${photo.caption || "추억 사진"} 크게 보기`}
              >
                <KioskLoadableImage
                  key={`${photo.id}-${photo.photoUrl}`}
                  src={toImgUrl(photo.photoUrl)}
                  alt={photo.caption || "추억 사진"}
                  containerClassName="aspect-square w-full"
                  imageClassName="grayscale"
                  preserveRatio
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
          <EmptyBox
            icon={<ImageIcon className="h-5 w-5" />}
            text="등록된 사진이 없습니다."
          />
        )}
      </KioskSection>

      <KioskSection id="video" eyebrow="Video" title="영상 기록">
        {videosStatus.loading ? (
          <EmptyBox
            icon={<Video className="h-5 w-5" />}
            text="영상을 불러오고 있습니다."
          />
        ) : videosStatus.unavailable ? (
          <RetryBox
            text="영상을 불러오지 못했습니다."
            pending={videosStatus.retrying}
            onRetry={videosStatus.onRetry}
          />
        ) : (
          <div className="overflow-hidden border border-[#dedbd5]">
            {featuredVideo ? (
              <button
                type="button"
                onClick={() => onVideo(featuredVideo)}
                className="group relative block aspect-video w-full bg-[#1f1d1a] text-left"
                aria-label={`${featuredVideo.title} 영상 재생`}
              >
                <KioskLoadableImage
                  key={`${featuredVideo.id}-${featuredVideo.youtubeVideoId}`}
                  src={
                    getYouTubeThumbnailUrl(featuredVideo.youtubeVideoId) ?? ""
                  }
                  alt=""
                  loadingText="영상 미리보기를 불러오는 중입니다."
                  containerClassName="absolute inset-0 h-full w-full bg-[#1f1d1a]"
                  imageClassName="object-cover opacity-80 transition group-active:opacity-60"
                  fallback={
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60"
                      aria-hidden="true"
                    >
                      <Video className="h-8 w-8" />
                      <span className="text-sm">미리보기 없음</span>
                    </div>
                  }
                />
                <span className="absolute inset-0 bg-black/30" />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                  <span className="flex h-20 w-20 items-center justify-center border border-white/70 bg-white/90 text-[#1f1d1a]">
                    <Play className="ml-1 h-9 w-9 fill-current" />
                  </span>
                  <span className="bg-black/60 px-4 py-2 text-base font-medium">
                    눌러서 영상 재생
                  </span>
                </span>
              </button>
            ) : (
              <div className="relative aspect-video bg-[#1f1d1a]">
                {portraitPhoto ? (
                  <KioskLoadableImage
                    key={`${portraitPhoto.id}-${portraitPhoto.photoUrl}-video`}
                    src={toImgUrl(portraitPhoto.photoUrl)}
                    alt={`${memorial.name} 영상 이미지`}
                    containerClassName="absolute inset-0 h-full w-full bg-[#1f1d1a]"
                    imageClassName="object-cover grayscale opacity-60"
                    fallback={<span aria-hidden="true" />}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <span className="flex items-center gap-3 text-base">
                    <Video className="h-5 w-5" />
                    등록된 영상이 없습니다.
                  </span>
                </div>
              </div>
            )}
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Video className="h-5 w-5" />
                <p className="text-lg font-medium">영상으로 남은 기억</p>
              </div>
              {playableVideos.length ? (
                <div className="space-y-3">
                  {playableVideos.map(video => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => onVideo(video)}
                      className="flex min-h-14 w-full items-center justify-between gap-4 border-t border-[#dedbd5] py-3 text-left text-base text-[#4f4c48]"
                    >
                      <span>{video.title}</span>
                      <Play className="h-4 w-4 shrink-0 fill-current" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-base leading-8 text-[#64615d]">
                  등록된 영상이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
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

        {booksStatus.loading ? (
          <EmptyBox
            icon={<BookOpenText className="h-5 w-5" />}
            text="책 기록을 불러오고 있습니다."
          />
        ) : booksStatus.unavailable ? (
          <RetryBox
            text="책 기록을 불러오지 못했습니다."
            pending={booksStatus.retrying}
            onRetry={booksStatus.onRetry}
          />
        ) : books.length ? (
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
                  <p className="mt-2 text-base text-[#64615d]">
                    {book.subtitle}
                  </p>
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
          <EmptyBox
            icon={<BookOpenText className="h-5 w-5" />}
            text="등록된 기록이 없습니다."
          />
        ) : null}
      </KioskSection>

      <KioskFamilySection
        key={memorial.slug}
        slug={memorial.slug}
        onVideo={onVideo}
      />

      <KioskLettersSection
        memorialSlug={memorial.slug}
        memorialName={memorial.name}
        accessToken={accessToken}
        isPrivate={memorial.visibility === "private"}
      />

      <div aria-hidden="true" className="h-[52vh] border-t border-[#dedbd5]" />
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
  const submissionLockRef = useRef<symbol | null>(null);
  const verifyAccess = trpc.memorial.verifyAccess.useMutation({
    networkMode: "always",
  });
  const passwordKeyboard = useKioskKeyboardField<HTMLInputElement>({
    id: `kiosk-memorial-password-${slug}`,
    label: "추모관 비밀번호",
    value: password,
    onChange: value => {
      setPassword(value);
      setMessage("");
    },
    maxLength: 80,
    defaultMode: "number",
    submitLabel: "입장",
    submitDisabled: verifyAccess.isPending,
    onSubmit: () => {
      void submitPassword();
      return false;
    },
  });

  async function submitPassword() {
    if (verifyAccess.isPending) return;

    if (!password.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage(KIOSK_CONNECTION_ERROR_MESSAGE);
      return;
    }

    const submissionToken = acquireKioskSubmissionLock(submissionLockRef);
    if (!submissionToken) return;

    try {
      const result = await verifyAccess.mutateAsync({ slug, password });
      if (result.accessToken) onUnlocked(result.accessToken);
    } catch (error) {
      setMessage(getKioskPasswordErrorMessage(error));
    } finally {
      releaseKioskSubmissionLock(submissionLockRef, submissionToken);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPassword();
  }

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
          ref={passwordKeyboard.ref}
          type="password"
          value={password}
          onChange={event => {
            setPassword(event.target.value);
            setMessage("");
          }}
          placeholder="비밀번호"
          className="mt-8 h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#aaa]"
          autoFocus
          autoComplete="off"
          maxLength={80}
          inputMode={passwordKeyboard.inputMode}
          onFocus={passwordKeyboard.onFocus}
          onClick={passwordKeyboard.onClick}
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

function KioskFamilySection({
  slug,
  onVideo,
}: {
  slug: string;
  onVideo: (video: KioskPlayableVideo) => void;
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<FamilyRoom | null>(null);
  const submissionLockRef = useRef<symbol | null>(null);
  const { closeKeyboard } = useKioskKeyboard();
  const statusQuery = trpc.familyRoom.status.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(slug), retry: false, networkMode: "always" }
  );
  const verifyFamily = trpc.familyRoom.verify.useMutation({
    networkMode: "always",
    onSuccess: data => {
      closeKeyboard();
      setRoom(data as FamilyRoom);
      setPassword("");
      setMessage("");
    },
    onError: error => setMessage(getKioskPasswordErrorMessage(error)),
  });
  const status = statusQuery.data as FamilyRoomStatus | undefined;
  const passwordKeyboard = useKioskKeyboardField<HTMLInputElement>({
    id: `kiosk-family-password-${slug}`,
    label: "가족관 비밀번호",
    value: password,
    onChange: value => {
      setPassword(value);
      setMessage("");
    },
    maxLength: 100,
    defaultMode: "number",
    submitLabel: "입장",
    submitDisabled: verifyFamily.isPending,
    onSubmit: () => {
      submitPassword();
      return false;
    },
  });

  function submitPassword() {
    if (verifyFamily.isPending) return;

    if (!password.trim()) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage(KIOSK_CONNECTION_ERROR_MESSAGE);
      return;
    }

    const submissionToken = acquireKioskSubmissionLock(submissionLockRef);
    if (!submissionToken) return;

    void (async () => {
      try {
        await verifyFamily.mutateAsync({
          memorialSlug: slug,
          password: password.trim(),
        });
      } catch {
        // The mutation's onError handler displays the message.
      } finally {
        releaseKioskSubmissionLock(submissionLockRef, submissionToken);
      }
    })();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPassword();
  }

  return (
    <KioskSection id="family" eyebrow="Family" title="가족관">
      {statusQuery.isLoading ? (
        <EmptyBox
          icon={<LockKeyhole className="h-5 w-5" />}
          text="가족관을 확인하고 있습니다."
        />
      ) : statusQuery.isError || statusQuery.isPaused ? (
        <RetryBox
          text="가족관 정보를 불러오지 못했습니다."
          pending={statusQuery.isFetching}
          onRetry={() => void statusQuery.refetch()}
        />
      ) : !status?.enabled ? (
        <EmptyBox
          icon={<LockKeyhole className="h-5 w-5" />}
          text="아직 준비된 가족관이 없습니다."
        />
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
          {room.video && isValidYouTubeVideoId(room.video.youtubeVideoId) && (
            <button
              type="button"
              onClick={() =>
                onVideo({
                  id: `family-room-${slug}`,
                  title: room.video!.title,
                  description: room.video!.description,
                  youtubeVideoId: room.video!.youtubeVideoId,
                })
              }
              className="block w-full overflow-hidden border border-[#dedbd5] bg-white text-left active:bg-[#f4f2ed]"
              aria-label={`${room.video.title} 눌러서 영상 재생`}
            >
              <span className="relative block aspect-video overflow-hidden bg-[#1f1d1a]">
                <KioskLoadableImage
                  src={getYouTubeThumbnailUrl(room.video.youtubeVideoId) ?? ""}
                  alt=""
                  loadingText="가족 영상을 준비하고 있습니다."
                  containerClassName="absolute inset-0 h-full w-full bg-[#1f1d1a]"
                  imageClassName="object-cover opacity-75"
                  fallback={<span aria-hidden="true" />}
                />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/25 text-white">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#1f1d1a] shadow-lg">
                    <Play className="ml-1 h-7 w-7 fill-current" />
                  </span>
                  <span className="bg-black/60 px-4 py-2 text-base font-medium">
                    눌러서 영상 재생
                  </span>
                </span>
              </span>
              <span className="block p-5">
                <span className="block text-[22px]" style={serifStyle}>
                  {room.video.title}
                </span>
                <span className="mt-2 block text-base leading-8 text-[#64615d]">
                  {room.video.description}
                </span>
              </span>
            </button>
          )}
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
            ref={passwordKeyboard.ref}
            type="password"
            value={password}
            onChange={event => {
              setPassword(event.target.value);
              setMessage("");
            }}
            placeholder="가족관 비밀번호"
            className="mt-6 h-16 w-full border border-[#18181b] px-5 text-2xl outline-none placeholder:text-[#aaa]"
            autoComplete="off"
            maxLength={100}
            inputMode={passwordKeyboard.inputMode}
            onFocus={passwordKeyboard.onFocus}
            onClick={passwordKeyboard.onClick}
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
  const submissionLockRef = useRef<symbol | null>(null);
  const { closeKeyboard } = useKioskKeyboard();
  const queryInput = { memorialSlug, accessToken: accessToken || undefined };
  const lettersQuery = trpc.letter.byMemorial.useQuery(queryInput, {
    retry: false,
    networkMode: "always",
  });
  const createLetter = trpc.letter.create.useMutation({
    networkMode: "always",
    onSuccess: async () => {
      closeKeyboard();
      setAuthor("");
      setContent("");
      setMessage("편지가 남겨졌습니다.");
      await Promise.all([
        utils.letter.byMemorial.invalidate(queryInput),
        utils.letter.recent.invalidate(),
      ]);
    },
    onError: () =>
      setMessage(
        "편지를 남기지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요."
      ),
  });
  const contentKeyboard = useKioskKeyboardField<HTMLTextAreaElement>({
    id: `kiosk-letter-content-${memorialSlug}`,
    label: "편지 내용",
    value: content,
    onChange: value => {
      setContent(value);
      setMessage("");
    },
    maxLength: 2000,
    multiline: true,
    submitLabel: "편지 남기기",
    submitDisabled: createLetter.isPending,
    onSubmit: submitLetter,
  });
  const authorKeyboard = useKioskKeyboardField<HTMLInputElement>({
    id: `kiosk-letter-author-${memorialSlug}`,
    label: "편지 작성자",
    value: author,
    onChange: value => {
      setAuthor(value);
      setMessage("");
    },
    maxLength: 80,
    submitLabel: "다음",
    onSubmit: () => {
      contentKeyboard.ref.current?.focus();
      return false;
    },
  });

  function submitLetter() {
    if (createLetter.isPending) return false;

    if (!author.trim() || !content.trim()) {
      setMessage("작성자와 내용을 입력해 주세요.");
      return false;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage(KIOSK_CONNECTION_ERROR_MESSAGE);
      return false;
    }

    const submissionToken = acquireKioskSubmissionLock(submissionLockRef);
    if (!submissionToken) return false;

    setMessage("");
    void (async () => {
      try {
        await createLetter.mutateAsync({
          memorialSlug,
          accessToken: accessToken || undefined,
          author: author.trim(),
          content: content.trim(),
        });
      } catch {
        // The mutation's onError handler displays the message.
      } finally {
        releaseKioskSubmissionLock(submissionLockRef, submissionToken);
      }
    })();
    return true;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLetter()) closeKeyboard();
  }

  const letters = (lettersQuery.data ?? []) as MemorialLetter[];

  return (
    <KioskSection id="letters" eyebrow="Letters" title="하늘로 보내는 편지">
      <form onSubmit={submit} className="border border-[#dedbd5]">
        <div className="border-b border-[#dedbd5] p-5">
          <p className="text-sm text-[#7a643e]">To {memorialName}</p>
          <input
            ref={authorKeyboard.ref}
            value={author}
            onChange={event => {
              setAuthor(event.target.value);
              setMessage("");
            }}
            placeholder="작성자"
            className="mt-4 h-12 w-full border-b border-[#dedbd5] bg-transparent text-xl outline-none placeholder:text-[#aaa]"
            autoComplete="off"
            maxLength={80}
            inputMode={authorKeyboard.inputMode}
            onFocus={authorKeyboard.onFocus}
            onClick={authorKeyboard.onClick}
          />
          <textarea
            ref={contentKeyboard.ref}
            value={content}
            onChange={event => {
              setContent(event.target.value);
              setMessage("");
            }}
            placeholder="전하고 싶은 마음을 남겨주세요."
            rows={4}
            className="mt-5 w-full resize-none bg-transparent text-lg leading-8 outline-none placeholder:text-[#aaa]"
            maxLength={2000}
            inputMode={contentKeyboard.inputMode}
            onFocus={contentKeyboard.onFocus}
            onClick={contentKeyboard.onClick}
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
        ) : lettersQuery.isError || lettersQuery.isPaused ? (
          <RetryBox
            text="편지를 불러오지 못했습니다."
            pending={lettersQuery.isFetching}
            onRetry={() => void lettersQuery.refetch()}
          />
        ) : letters.length ? (
          letters.slice(0, 4).map(letter => (
            <article key={letter.id} className="border-b border-[#dedbd5] py-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-base font-medium">From {letter.author}</p>
                <p className="text-sm text-[#777]">
                  {formatDate(letter.createdAt)}
                </p>
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
      <h2
        className="mb-7 text-[36px] font-normal leading-tight"
        style={serifStyle}
      >
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

function RetryBox({
  text,
  pending,
  onRetry,
}: {
  text: string;
  pending: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center border border-[#dedbd5] px-6 text-center">
      <p className="text-base text-[#64615d]">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending}
        className="mt-5 flex h-12 min-w-[160px] items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "다시 연결 중" : "다시 시도"}
      </button>
    </div>
  );
}

function KioskState({
  children,
  description,
  actionLabel,
  actionKind = "retry",
  actionPending = false,
  onAction,
}: {
  children: ReactNode;
  description?: string;
  actionLabel?: string;
  actionKind?: "retry" | "back";
  actionPending?: boolean;
  onAction?: () => void;
}) {
  return (
    <section className="px-8 py-16">
      <div className="flex min-h-[240px] flex-col items-center justify-center border border-[#dedbd5] px-6 py-12 text-center">
        <p className="text-lg font-medium text-[#34312d]">{children}</p>
        {description && (
          <p className="mt-3 max-w-md text-base leading-7 text-[#64615d]">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionPending}
            className="mt-7 flex h-14 min-w-[180px] items-center justify-center gap-2 bg-[#18181b] px-6 text-base font-medium text-white disabled:opacity-50"
          >
            {actionKind === "back" ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <RefreshCw
                className={`h-4 w-4 ${actionPending ? "animate-spin" : ""}`}
              />
            )}
            {actionPending ? "다시 연결 중" : actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ block: "start", behavior: "smooth" });
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
