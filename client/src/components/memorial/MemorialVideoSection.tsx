import InlineEditText from "@/components/InlineEditText";
import { useAuth } from "@/_core/hooks/useAuth";
import { toImgUrl } from "@/lib/imageUrl";
import { useScrollLock } from "@/lib/scrollLock";
import { trpc } from "@/lib/trpc";
import { extractYoutubeVideoId } from "@shared/youtubeId";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Play,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type MemorialVideo = {
  id: number;
  memorialId: number;
  title: string;
  description: string | null;
  youtubeVideoId: string;
  isVisible: number;
  sortOrder: number;
};

type MemorialVideoSectionProps = {
  memorialId: number;
  memorialName: string;
  churchName: string;
  coverImageUrl?: string;
  isAdmin: boolean;
  accessToken?: string;
  /**
   * 주면 영상을 제자리에서 틀지 않고 이 함수로 넘긴다. 키오스크는 가족관 영상처럼
   * 팝업(KioskVideoDialog)으로 연다 (2026-09-16 현장 요청).
   */
  onPlay?: (video: MemorialVideo) => void;
};

function youtubeThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

export default function MemorialVideoSection({
  memorialId,
  memorialName,
  churchName,
  coverImageUrl,
  isAdmin,
  accessToken,
  onPlay,
}: MemorialVideoSectionProps) {
  const utils = trpc.useUtils();
  const listInput = { memorialId, accessToken: accessToken || undefined };
  const videosQuery = trpc.video.listByMemorial.useQuery(listInput);
  const videos = (videosQuery.data ?? []) as MemorialVideo[];
  const visibleVideos = useMemo(
    () => videos.filter(video => video.isVisible !== 0),
    [videos]
  );
  // 2026-09-16: 관리자뿐 아니라 추모관 주인과 초대받은 가족도 유튜브 영상을 넣는다.
  // 권한 판단은 사진첩과 같다(gallery.permissions).
  const { user } = useAuth();
  const permissions = trpc.gallery.permissions.useQuery(
    { memorialId },
    { enabled: Boolean(user) && memorialId > 0, retry: false }
  );
  const canEdit =
    Boolean(user) &&
    memorialId > 0 &&
    (isAdmin || permissions.data?.canManage === true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  // 영상은 가족관 영상처럼 팝업으로 튼다 (2026-09-16 요청). 키오스크는 onPlay 로
  // 키오스크 영상 창을 쓰고, 홈페이지는 아래 VideoPopup 을 쓴다.
  const [popupVideo, setPopupVideo] = useState<MemorialVideo | null>(null);
  const playVideo = (video: MemorialVideo | undefined) => {
    if (!video) return;
    if (onPlay) onPlay(video);
    else setPopupVideo(video);
  };
  // 방문자가 볼 영상: 고른 것이 있으면 그것, 없으면 첫 번째
  const visitorVideo =
    visibleVideos.find(video => video.youtubeVideoId === selectedVideoId) ??
    visibleVideos[0];
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [addedMessage, setAddedMessage] = useState("");
  const pastedVideoId = extractYoutubeVideoId(newUrl);

  const currentVideo = useMemo(
    () =>
      videos.find(video => video.youtubeVideoId === selectedVideoId) ??
      videos[0],
    [selectedVideoId, videos]
  );

  const createVideo = trpc.video.create.useMutation({
    onSuccess: () => {
      toast.success("영상을 넣었습니다.");
      setNewTitle("");
      setNewUrl("");
      setFormError("");
      setAddedMessage("영상을 넣었습니다. 아래 목록에서 확인해 주세요.");
      utils.video.listByMemorial.invalidate(listInput);
    },
    onError: error => {
      const message =
        error.message && !error.message.trim().startsWith("[")
          ? error.message
          : "영상을 넣지 못했습니다. 주소와 인터넷 연결을 확인해 주세요.";
      setFormError(message);
      toast.error(message);
    },
  });
  const updateVideo = trpc.video.update.useMutation({
    onSuccess: () => utils.video.listByMemorial.invalidate(listInput),
    onError: error => toast.error(error.message),
  });
  const deleteVideo = trpc.video.delete.useMutation({
    onSuccess: () => {
      toast.success("영상이 삭제되었습니다.");
      utils.video.listByMemorial.invalidate(listInput);
      setSelectedVideoId(null);
    },
    onError: error => toast.error(error.message),
  });

  const addVideo = async () => {
    if (saving) return;
    setAddedMessage("");
    if (!newUrl.trim()) {
      setFormError("유튜브 주소를 붙여 넣어 주세요.");
      return;
    }
    const youtubeVideoId = extractYoutubeVideoId(newUrl);
    if (!youtubeVideoId) {
      setFormError(
        "유튜브 주소를 확인해 주세요. 유튜브에서 '공유' → '복사'로 얻은 주소를 붙여 넣으면 됩니다."
      );
      return;
    }

    setFormError("");
    setSaving(true);
    try {
      await createVideo.mutateAsync({
        memorialId,
        title: newTitle.trim() || `${memorialName} 추모 영상`,
        youtubeVideoId,
        sortOrder: videos.length,
      });
    } catch {
      // onError 에서 안내한다.
    } finally {
      setSaving(false);
    }
  };

  const moveVideo = async (index: number, direction: -1 | 1) => {
    if (!canEdit) return;
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;

    const next = [...videos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await Promise.all(
      next.map((video, sortOrder) =>
        updateVideo.mutateAsync({ id: video.id, sortOrder })
      )
    );
    toast.success("영상 순서가 변경되었습니다.");
  };

  if (!videosQuery.isLoading && visibleVideos.length === 0 && !canEdit) {
    return null;
  }

  return (
    <section className="border-t border-[#dedede] bg-white py-20 md:py-28">
      <div className="container">
        <div className="memorial-section-heading">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#666666]">
            Video Archive
          </p>
          <h2
            className="break-keep text-3xl font-light [overflow-wrap:anywhere] md:text-4xl"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            영상 기록
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#666666]">
            {churchName} · {memorialName}
          </p>
        </div>

        {canEdit && (
          <form
            onSubmit={event => {
              event.preventDefault();
              void addVideo();
            }}
            className="mx-auto mb-8 max-w-2xl border border-[#dedede] bg-white p-5 text-left"
          >
            <p className="flex items-center gap-2 text-lg font-medium text-[#171717]">
              <Youtube className="h-5 w-5" aria-hidden="true" />
              유튜브 영상 넣기
            </p>
            <p className="mt-2 text-sm leading-6 text-[#555555]">
              유튜브 영상 아래 &lsquo;공유&rsquo;를 누르고 &lsquo;복사&rsquo;한
              주소를 붙여 넣으세요. &lsquo;비공개&rsquo; 영상은 재생되지 않으니
              &lsquo;공개&rsquo;나 &lsquo;일부 공개&rsquo;로 올려 주세요.
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-[#3f3b36]">
                유튜브 주소
              </span>
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                value={newUrl}
                onChange={event => {
                  setNewUrl(event.target.value);
                  setFormError("");
                  setAddedMessage("");
                }}
                placeholder="https://youtu.be/..."
                className="h-12 w-full border border-[#b5b0a7] bg-[#fafafa] px-4 text-base text-[#121212] outline-none focus:border-[#18181b] focus:bg-white"
              />
            </label>
            {pastedVideoId && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={youtubeThumb(pastedVideoId)}
                  alt="붙여 넣은 영상 미리보기"
                  className="h-16 w-28 shrink-0 object-cover"
                />
                <p className="text-sm text-[#2f6f4f]">
                  영상을 찾았습니다. 맞으면 아래 &lsquo;영상 넣기&rsquo;를 눌러
                  주세요.
                </p>
              </div>
            )}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-[#3f3b36]">
                영상 제목 (적지 않아도 됩니다)
              </span>
              <input
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                placeholder={`${memorialName} 추모 영상`}
                maxLength={300}
                className="h-12 w-full border border-[#b5b0a7] bg-[#fafafa] px-4 text-base text-[#121212] outline-none focus:border-[#18181b] focus:bg-white"
              />
            </label>
            {formError && (
              <p role="alert" className="mt-3 text-sm leading-6 text-[#9f2a2a]">
                {formError}
              </p>
            )}
            {addedMessage && (
              <p
                role="status"
                className="mt-3 flex items-center gap-2 text-sm font-medium text-[#2f6f4f]"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {addedMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#171717] px-4 text-base font-medium text-white disabled:opacity-50"
            >
              {saving ? "넣는 중" : "영상 넣기"}
            </button>
          </form>
        )}

        {videosQuery.isLoading ? (
          <div className="border border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
            영상을 불러오고 있습니다.
          </div>
        ) : !canEdit && visibleVideos.length > 0 ? (
          <div className="mx-auto grid max-w-5xl overflow-hidden border border-[#dedede] bg-[#ffffff] md:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.72fr)]">
            {(
              <button
                type="button"
                onClick={() => playVideo(visitorVideo)}
                aria-label="영상 재생"
                className="group relative block min-h-[260px] w-full overflow-hidden bg-[#171717] text-left md:min-h-[420px]"
              >
              {coverImageUrl ? (
                <img
                  src={toImgUrl(coverImageUrl)}
                  alt={`${memorialName} 영상 기록`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#171717]" />
              )}
              <div className="absolute inset-0 bg-[#171717]/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/72 via-transparent to-white/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center border border-white/70 bg-white/82 text-[#171717] shadow-[0_16px_50px_rgba(31,29,26,0.18)]">
                  <Play
                    className="ml-1 h-7 w-7 fill-current"
                    strokeWidth={1.6}
                  />
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xs font-medium uppercase tracking-[0.26em] text-white/78">
                  Video Memory
                </p>
                <p
                  className="mt-3 break-keep text-2xl font-light text-white [overflow-wrap:anywhere] md:text-3xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  영상으로 남은 기억
                </p>
              </div>
                          </button>
            )}
            <div className="flex flex-col justify-center p-6 md:p-9">
              <p className="break-keep text-sm leading-7 text-[#666666] [overflow-wrap:anywhere]">
                고인의 표정과 목소리를 영상으로 함께 기억합니다.
              </p>
              <div className="mt-8 border-t border-[#dedede] pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#666666]">
                  Archive
                </p>
                <p
                  className="mt-3 text-xl font-light text-[#171717]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  영상 기록 {visibleVideos.length}편
                </p>
                <p className="mt-3 text-sm leading-7 text-[#666666]">
                  {churchName} · {memorialName}
                </p>
                {visibleVideos.length > 1 && (
                  <ul className="mt-5 space-y-2">
                    {visibleVideos.map(video => (
                      <li key={video.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVideoId(video.youtubeVideoId);
                            playVideo(video);
                          }}
                          className={`flex w-full items-center gap-3 border p-2 text-left text-sm transition-colors ${
                            visitorVideo?.id === video.id
                              ? "border-[#171717] bg-white"
                              : "border-[#dedede] bg-white hover:bg-[#f9f9f9]"
                          }`}
                        >
                          <img
                            src={youtubeThumb(video.youtubeVideoId)}
                            alt=""
                            className="h-12 w-20 shrink-0 object-cover"
                          />
                          <span className="min-w-0 truncate text-[#171717]">{video.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : videos.length > 0 ? (
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden border border-[#dedede] bg-black">
              {currentVideo ? (
                <button
                  type="button"
                  onClick={() => playVideo(currentVideo)}
                  aria-label={`${currentVideo.title} 영상 재생`}
                  className="group relative block aspect-video w-full overflow-hidden"
                >
                  <img
                    src={youtubeThumb(currentVideo.youtubeVideoId)}
                    alt=""
                    className="h-full w-full object-cover opacity-80"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#171717] shadow-lg">
                      <Play className="ml-1 h-7 w-7 fill-current" />
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-[#ffffff]">
                  <Youtube className="h-10 w-10 text-[#666666]" />
                </div>
              )}
            </div>

            <div className="space-y-2 lg:max-h-[430px] lg:overflow-y-auto">
              {videos.map((video, index) => {
                const active =
                  (selectedVideoId ?? videos[0]?.youtubeVideoId) ===
                  video.youtubeVideoId;
                const hidden = video.isVisible === 0;
                return (
                  <article
                    key={video.id}
                    className={`group relative flex gap-3 border p-2 transition-colors ${
                      active
                        ? "border-[#171717] bg-white"
                        : "border-[#dedede] bg-white hover:bg-[#f9f9f9]"
                    }`}
                    style={{ opacity: hidden ? 0.55 : 1 }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 gap-3 text-left"
                      onClick={() => {
                        setSelectedVideoId(video.youtubeVideoId);
                        playVideo(video);
                      }}
                    >
                      <span className="relative h-16 w-24 shrink-0 overflow-hidden bg-[#ffffff]">
                        <img
                          src={youtubeThumb(video.youtubeVideoId)}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                        {active && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                            <Play className="h-5 w-5 fill-white" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 pt-1">
                        <span className="block text-sm font-medium leading-6 text-[#171717]">
                          {canEdit ? (
                            <InlineEditText
                              value={video.title}
                              isAdmin
                              onSave={title =>
                                updateVideo.mutateAsync({ id: video.id, title })
                              }
                            />
                          ) : (
                            video.title
                          )}
                        </span>
                        {hidden && (
                          <span className="mt-1 inline-block border border-[#dedede] px-2 py-0.5 text-[11px] text-[#666666]">
                            숨김
                          </span>
                        )}
                      </span>
                    </button>

                    {canEdit && (
                      <div className="flex shrink-0 flex-col gap-1">
                        <SmallButton
                          label="앞으로"
                          disabled={index === 0}
                          onClick={() => moveVideo(index, -1)}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </SmallButton>
                        <SmallButton
                          label="뒤로"
                          disabled={index === videos.length - 1}
                          onClick={() => moveVideo(index, 1)}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </SmallButton>
                        <SmallButton
                          label={hidden ? "공개" : "숨김"}
                          onClick={() =>
                            updateVideo.mutate({
                              id: video.id,
                              isVisible: hidden,
                            })
                          }
                        >
                          {hidden ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </SmallButton>
                        <SmallButton
                          label="삭제"
                          danger
                          onClick={() => {
                            if (confirm("이 영상을 삭제하시겠습니까?")) {
                              deleteVideo.mutate({ id: video.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </SmallButton>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center border border-dashed border-[#dedede] bg-white px-4 py-12 text-center text-sm leading-6 text-[#666666]">
            <Youtube className="mb-3 h-10 w-10" aria-hidden="true" />
            아직 넣은 영상이 없습니다. 위 칸에 유튜브 주소를 붙여 넣어 주세요.
          </div>
        )}
      </div>
      {popupVideo && (
        <VideoPopup video={popupVideo} onClose={() => setPopupVideo(null)} />
      )}
    </section>
  );
}

/** 홈페이지 영상 팝업. 뒤 화면은 잠그고, 바깥을 누르거나 Esc·닫기로 닫는다. */
function VideoPopup({
  video,
  onClose,
}: {
  video: MemorialVideo;
  onClose: () => void;
}) {
  useScrollLock();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${video.title} 영상`}
      className="fixed inset-0 z-[120] flex items-center justify-center overscroll-contain bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p
            className="min-w-0 truncate text-lg font-light text-white"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {video.title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 border-[#171717] bg-white px-4 text-base font-medium text-[#171717]"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
            닫기
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0&playsinline=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        {video.description && (
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/80">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-6 w-6 items-center justify-center border text-xs disabled:opacity-30 ${
        danger
          ? "border-red-200 bg-red-500 text-white"
          : "border-[#dedede] bg-white/90 text-[#555555]"
      }`}
    >
      {children}
    </button>
  );
}
