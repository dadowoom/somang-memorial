import InlineEditText from "@/components/InlineEditText";
import { toImgUrl } from "@/lib/imageUrl";
import { trpc } from "@/lib/trpc";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Play,
  Plus,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
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
};

export function extractYoutubeId(input: string) {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return trimmed;
}

function youtubeThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

export default function MemorialVideoSection({
  memorialId,
  memorialName,
  churchName,
  coverImageUrl,
  isAdmin,
}: MemorialVideoSectionProps) {
  const utils = trpc.useUtils();
  const videosQuery = trpc.video.listByMemorial.useQuery({ memorialId });
  const videos = (videosQuery.data ?? []) as MemorialVideo[];
  const visibleVideos = useMemo(
    () => videos.filter(video => video.isVisible !== 0),
    [videos]
  );
  const canEdit = isAdmin && memorialId > 0;
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const currentVideo = useMemo(
    () =>
      videos.find(video => video.youtubeVideoId === selectedVideoId) ??
      videos[0],
    [selectedVideoId, videos]
  );

  const createVideo = trpc.video.create.useMutation({
    onSuccess: () => {
      toast.success("영상이 추가되었습니다.");
      setShowAddForm(false);
      setNewTitle("");
      setNewUrl("");
      utils.video.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const updateVideo = trpc.video.update.useMutation({
    onSuccess: () => utils.video.listByMemorial.invalidate({ memorialId }),
    onError: error => toast.error(error.message),
  });
  const deleteVideo = trpc.video.delete.useMutation({
    onSuccess: () => {
      toast.success("영상이 삭제되었습니다.");
      utils.video.listByMemorial.invalidate({ memorialId });
      setSelectedVideoId(null);
    },
    onError: error => toast.error(error.message),
  });

  const addVideo = async () => {
    if (saving) return;
    const youtubeVideoId = extractYoutubeId(newUrl);
    if (!newTitle.trim()) {
      toast.error("영상 제목을 입력해주세요.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId)) {
      toast.error("유효한 유튜브 주소 또는 영상 ID를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      await createVideo.mutateAsync({
        memorialId,
        title: newTitle.trim(),
        youtubeVideoId,
        sortOrder: videos.length,
      });
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
    <section className="border-t border-[#e6ded1] bg-white py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#7f673d]">
            Video Archive
          </p>
          <h2
            className="text-3xl font-light md:text-4xl"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            영상 기록
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#6f6a61]">
            {churchName} · {memorialName}
          </p>
        </div>

        {videosQuery.isLoading ? (
          <div className="border border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
            영상을 불러오고 있습니다.
          </div>
        ) : !canEdit && visibleVideos.length > 0 ? (
          <div className="mx-auto grid max-w-5xl overflow-hidden border border-[#e6ded1] bg-[#fbfaf8] md:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.72fr)]">
            <div className="relative min-h-[260px] overflow-hidden bg-[#2e2218] md:min-h-[420px]">
              {coverImageUrl ? (
                <img
                  src={toImgUrl(coverImageUrl)}
                  alt={`${memorialName} 영상 기록`}
                  className="absolute inset-0 h-full w-full object-cover grayscale"
                />
              ) : (
                <div className="absolute inset-0 bg-[#2e2218]" />
              )}
              <div className="absolute inset-0 bg-[#2e2218]/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f1d1a]/72 via-transparent to-white/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center border border-white/70 bg-white/82 text-[#2e2218] shadow-[0_16px_50px_rgba(31,29,26,0.18)]">
                  <Play className="ml-1 h-7 w-7 fill-current" strokeWidth={1.6} />
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xs font-medium uppercase tracking-[0.26em] text-white/78">
                  Video Memory
                </p>
                <p
                  className="mt-3 text-2xl font-light text-white md:text-3xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  영상으로 남은 기억
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 md:p-9">
              <p className="text-sm leading-7 text-[#6f6a61]">
                사진과 글로 다 담기 어려운 고인의 표정과 목소리를 함께
                기억할 수 있도록 영상 기록을 준비하는 공간입니다.
              </p>
              <div className="mt-8 border-t border-[#e6ded1] pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#7f673d]">
                  Archive
                </p>
                <p
                  className="mt-3 text-xl font-light text-[#2e2218]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  영상 기록 {visibleVideos.length}편
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6f6a61]">
                  {churchName} · {memorialName}
                </p>
              </div>
            </div>
          </div>
        ) : videos.length > 0 ? (
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden border border-[#e6ded1] bg-black">
              {currentVideo ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${currentVideo.youtubeVideoId}`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-[#fbfaf8]">
                  <Youtube className="h-10 w-10 text-[#7f673d]" />
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
                        ? "border-[#1f1d1a] bg-white"
                        : "border-[#e6ded1] bg-white hover:bg-[#faf9f7]"
                    }`}
                    style={{ opacity: hidden ? 0.55 : 1 }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 gap-3 text-left"
                      onClick={() => setSelectedVideoId(video.youtubeVideoId)}
                    >
                      <span className="relative h-16 w-24 shrink-0 overflow-hidden bg-[#fbfaf8]">
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
                        <span className="block text-sm font-medium leading-6 text-[#2e2218]">
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
                            <span className="mt-1 inline-block border border-[#e6ded1] px-2 py-0.5 text-[11px] text-[#6f6a61]">
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
          <button
            type="button"
            className="mx-auto flex aspect-video w-full max-w-4xl flex-col items-center justify-center border border-dashed border-[#e6ded1] bg-white text-[#6f6a61]"
            onClick={() => setShowAddForm(true)}
          >
            <Youtube className="mb-3 h-10 w-10" />
            영상 추가
          </button>
        )}

        {canEdit && (
          <div className="mx-auto mt-6 max-w-xl">
            {showAddForm ? (
              <div className="border border-[#e6ded1] bg-white p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#4f4638]">
                  <Youtube className="h-4 w-4" />
                  새 영상 추가
                </p>
                <input
                  value={newTitle}
                  onChange={event => setNewTitle(event.target.value)}
                  placeholder="영상 제목"
                  className="mb-2 h-10 w-full border border-[#e6ded1] bg-white px-3 text-sm outline-none"
                />
                <input
                  value={newUrl}
                  onChange={event => setNewUrl(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") addVideo();
                    if (event.key === "Escape") setShowAddForm(false);
                  }}
                  placeholder="유튜브 주소 또는 영상 ID"
                  className="h-10 w-full border border-[#e6ded1] bg-white px-3 text-sm outline-none"
                />
                <p className="mt-2 text-xs text-[#6f6a61]">
                  유튜브 주소를 붙여 넣으면 영상 ID를 자동으로 추출합니다.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="inline-flex h-9 items-center gap-1 border border-[#e6ded1] px-3 text-xs text-[#4f4638]"
                  >
                    <X className="h-3 w-3" />
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={addVideo}
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-1 bg-[#1f1d1a] px-3 text-xs text-white disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    {saving ? "저장 중" : "추가"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex h-10 items-center gap-2 border border-dashed border-[#c8b383] bg-white px-4 text-sm text-[#4f4638]"
                >
                  <Plus className="h-4 w-4" />
                  영상 추가
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
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
          : "border-[#e6ded1] bg-white/90 text-[#4f4638]"
      }`}
    >
      {children}
    </button>
  );
}
