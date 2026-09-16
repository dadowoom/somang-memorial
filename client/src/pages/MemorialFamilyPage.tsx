import { toImgUrl } from "@/lib/imageUrl";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
} from "@/lib/youtube";
import {
  ArrowLeft,
  BookOpenText,
  HeartHandshake,
  LockKeyhole,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

type FamilyRoom = {
  memorialId: number;
  memorialSlug: string;
  memorialName: string;
  memorialRole: string;
  church: string;
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
  // 가족관 사진 (2026-09-16). 이 가족관 것만 내려온다.
  photos?: Array<{
    id: number;
    photoUrl: string;
    caption: string | null;
  }>;
};

type FamilyRoomStatus = {
  memorialId: number;
  memorialSlug: string;
  // 비공개 추모관이면 null (비밀번호 전에는 이름을 감춘다, 2026-09-14)
  memorialName: string | null;
  enabled: boolean;
  href: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const getMemorialAccessStorageKey = (slug: string) =>
  `somang.memorialAccess.${slug}`;
const readStoredAccessToken = (slug: string) => {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(getMemorialAccessStorageKey(slug)) || "";
};

export default function MemorialFamilyPage() {
  const [, params] = useRoute<{ slug: string }>("/memorial/:slug/family");
  const slug = params?.slug ?? "";
  const [accessToken, setAccessToken] = useState(() =>
    readStoredAccessToken(slug)
  );
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<FamilyRoom | null>(null);

  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );

  useEffect(() => {
    setAccessToken(readStoredAccessToken(slug));
    setPassword("");
    setMessage("");
    setRoom(null);
  }, [slug]);

  const statusQuery = trpc.familyRoom.status.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(slug) }
  );
  const verifyMutation = trpc.familyRoom.verify.useMutation({
    onSuccess: data => {
      setRoom(data as FamilyRoom);
      setPassword("");
      setMessage("");
    },
    onError: error => setMessage(error.message),
  });

  const memorial = memorialQuery.data;
  const status = statusQuery.data as FamilyRoomStatus | undefined;
  const hasFamilyRoom = status?.enabled ?? false;
  const unlockedRoom = room?.memorialSlug === slug ? room : null;

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setMessage("비밀번호를 입력해 주세요.");
      return;
    }
    setMessage("");
    verifyMutation.mutate({ memorialSlug: slug, password: trimmed });
  };

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        {unlockedRoom ? (
          <section className="border-b border-[#dedede] bg-white">
            <div className="container py-12 md:py-20">
              <Link href={`/memorial/${slug}/archive`}>
                <button className="mb-10 inline-flex h-10 items-center gap-2 border border-[#dedede] bg-white px-4 text-sm text-[#555555] transition-colors hover:bg-[#f9f9f9]">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
                  추모관으로 돌아가기
                </button>
              </Link>

              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:items-end">
                <div>
                  <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.28em] text-[#666666]">
                    Family Room
                  </p>
                  <h1
                    className="text-5xl font-light leading-tight md:text-7xl"
                    style={serifStyle}
                  >
                    가족관
                  </h1>
                  <p
                    className="mt-5 text-xl font-light text-[#666666]"
                    style={serifStyle}
                  >
                    {unlockedRoom.memorialName} {unlockedRoom.memorialRole}
                  </p>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-[#4f4f4f]">
                    가족에게만 전하는 사랑과 믿음의 이야기.
                    함께 간직할 기억을 이곳에서 이어갑니다.
                  </p>
                </div>

                <div className="border border-[#dedede] bg-[#ffffff] p-6 md:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#171717] text-white">
                      <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#121212]">
                        가족 전용 공간
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[#666666]">
                        공개 추모관과 분리된 비공개 기록 공간입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={unlockedRoom ? "py-14 md:py-20" : "py-12 md:py-20"}>
          <div className="container">
            {statusQuery.isLoading ? (
              <StateBlock text="가족관을 불러오고 있습니다." />
            ) : statusQuery.isError || !status ? (
              <StateBlock text="추모관을 찾을 수 없습니다." />
            ) : !hasFamilyRoom ? (
              <StateBlock text="아직 준비된 가족관이 없습니다." />
            ) : unlockedRoom ? (
              <UnlockedRoom
                key={unlockedRoom.memorialSlug}
                room={unlockedRoom}
              />
            ) : (
              <PasswordGate
                memorialName={
                  memorial?.name ?? status.memorialName ?? "비공개 추모관"
                }
                memorialRole={memorial?.role ?? ""}
                password={password}
                message={message}
                isPending={verifyMutation.isPending}
                onPasswordChange={setPassword}
                onSubmit={submitPassword}
                backHref={`/memorial/${slug}/archive`}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PasswordGate({
  memorialName,
  memorialRole,
  password,
  message,
  isPending,
  backHref,
  onPasswordChange,
  onSubmit,
}: {
  memorialName: string;
  memorialRole: string;
  password: string;
  message: string;
  isPending: boolean;
  backHref: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="family-gate">
      <Link href={backHref}>
        <button className="mb-6 inline-flex h-10 items-center gap-2 border border-[#dedede] bg-white px-4 text-sm text-[#555555] transition-colors hover:bg-[#f9f9f9]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
          추모관으로 돌아가기
        </button>
      </Link>

      <form
        onSubmit={onSubmit}
        className="border border-[#dedede] bg-white p-6 md:p-10"
      >
        <div className="mb-8 border-b border-[#dedede] pb-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center bg-[#171717] text-white">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#666666]">
            Private Family Room
          </p>
          <h1
            className="text-4xl font-light leading-tight md:text-6xl"
            style={serifStyle}
          >
            가족관
          </h1>
          <p className="mt-5 text-lg font-light text-[#666666]" style={serifStyle}>
            {memorialName} {memorialRole}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#666666]">
            이 공간은 유족과 가족을 위한 비공개 공간입니다. 전달받은
            비밀번호를 입력한 뒤 들어갈 수 있습니다.
          </p>
        </div>

        <label htmlFor="family-password" className="mb-3 block text-sm font-medium text-[#555555]">
          가족관 비밀번호
        </label>
        <input
          value={password}
          onChange={event => onPasswordChange(event.target.value)}
          id="family-password"
          type="password"
          placeholder="비밀번호를 입력해 주세요"
          autoComplete="off"
          className="h-12 w-full border border-[#dedede] bg-white px-4 text-base outline-none transition-colors focus:border-[#171717]"
        />
        {message && (
          <p className="mt-3 text-sm text-red-500">{message}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#171717] px-5 text-sm font-medium text-white transition-colors hover:bg-[#393939] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "확인 중" : "비밀번호 확인"}
          <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </form>
    </div>
  );
}

function UnlockedRoom({ room }: { room: FamilyRoom }) {
  const icons = [Users, BookOpenText, HeartHandshake];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="family-letter border border-[#dedede] bg-white p-6 md:p-10">
        <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#666666]">
          가족에게 남기는 마음
        </p>
        <h2 className="text-3xl font-light md:text-5xl" style={serifStyle}>
          {room.title}
        </h2>
        <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-[#4f4f4f]">
          {room.intro}
        </p>
      </div>

      {room.video && (
        <FamilyVideoCard key={room.video.youtubeVideoId} video={room.video} />
      )}

      <FamilyPhotoGrid photos={room.photos ?? []} />

      <div className="mt-6 grid gap-px bg-[#dedede] md:grid-cols-3">
        {room.notes.map((note, index) => {
          const Icon = icons[index] ?? BookOpenText;
          return (
            <article key={note.title} className="bg-white p-6 md:p-7">
              <div className="mb-8 flex h-10 w-10 items-center justify-center border border-[#dedede]">
                <Icon className="h-5 w-5 text-[#171717]" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-light" style={serifStyle}>
                {note.title}
              </h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#666666]">{note.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** 가족관 사진 (2026-09-16). 가족이 관리 화면에서 올린 사진을 이 가족관에서만 보여 준다. */
function FamilyPhotoGrid({
  photos,
}: {
  photos: NonNullable<FamilyRoom["photos"]>;
}) {
  if (photos.length === 0) return null;

  return (
    <section className="mt-6 border border-[#dedede] bg-white p-6 md:p-10">
      <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#666666]">
        Family Photos
      </p>
      <h2 className="text-2xl font-light md:text-3xl" style={serifStyle}>
        가족끼리 간직하는 사진
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {photos.map(photo => (
          <li key={photo.id} className="border border-[#dedede] bg-[#fdfdfd]">
            <img
              src={toImgUrl(photo.photoUrl)}
              alt={photo.caption || "가족관 사진"}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            {photo.caption && (
              <p className="break-keep px-4 py-3 text-sm leading-6 text-[#4f4f4f] [overflow-wrap:anywhere]">
                {photo.caption}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FamilyVideoCard({
  video,
}: {
  video: NonNullable<FamilyRoom["video"]>;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(video.youtubeVideoId, true);
  const thumbnailUrl = getYouTubeThumbnailUrl(video.youtubeVideoId);

  if (!isValidYouTubeVideoId(video.youtubeVideoId) || !embedUrl) return null;

  return (
    <section className="mt-6 overflow-hidden border border-[#dedede] bg-white">
      <div className="p-6 md:p-8">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#666666]">
          Family Video
        </p>
        <h3 className="text-2xl font-light md:text-3xl" style={serifStyle}>
          {video.title}
        </h3>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#666666]">
          {video.description}
        </p>
      </div>

      <div className="aspect-video bg-[#171717]">
        {isPlaying ? (
          <iframe
            src={embedUrl}
            title={`${video.title} 영상`}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="group relative block h-full w-full overflow-hidden text-white"
            aria-label={`${video.title} 눌러서 영상 재생`}
          >
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover opacity-75 transition group-hover:opacity-65"
              />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/25">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#171717] shadow-lg md:h-20 md:w-20">
                <Play className="ml-1 h-7 w-7 fill-current md:h-9 md:w-9" />
              </span>
              <span className="bg-black/60 px-4 py-2 text-sm font-medium md:text-base">
                눌러서 영상 재생
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

function StateBlock({ text }: { text: string }) {
  return (
    <div className="border border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
      {text}
    </div>
  );
}
