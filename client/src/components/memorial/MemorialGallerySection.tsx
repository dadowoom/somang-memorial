import InlineEditText from "@/components/InlineEditText";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  compressImageFile,
  makeThumbnailDataUrl,
} from "@/lib/imageCompression";
import { toImgUrl } from "@/lib/imageUrl";
import { useScrollLock } from "@/lib/scrollLock";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ThumbImage from "@/components/ThumbImage";

type GalleryPhoto = {
  id: number;
  memorialId: number;
  photoUrl: string;
  photoKey: string;
  caption: string | null;
  year: string | null;
  sortOrder: number;
  isRepresentative: number;
};

/** 앨범 한 칸에 필요한 것. 추모관 앨범과 가족관 사진이 같이 쓴다 (2026-09-16). */
export type AlbumPhoto = {
  id: number;
  photoUrl: string;
  caption: string | null;
  year?: string | null;
};

type MemorialGallerySectionProps = {
  memorialId: number;
  isAdmin: boolean;
  accessToken?: string;
};

/**
 * 2026-09-16 현장 요청으로 사진을 두 가지로 나눈다.
 * - 프로필 사진: 추모관 맨 위·부고장·키오스크에 크게 보이는 한 장.
 *   DB 에서는 isRepresentative = 1 인 사진이다.
 * - 앨범: 나머지 사진. 방문자에게는 "앨범"으로 보인다.
 * 전에는 이름이 "사진첩/대표사진"이었고, 앨범에 올린 첫 사진이 말없이 대표
 * 사진이 되어 맨 위 사진을 어디서 올리는지 알 수 없었다.
 */
export type UploadTarget = "profile" | "album";

export type UploadProgress = {
  target: UploadTarget;
  done: number;
  total: number;
};

export type UploadResult = {
  target: UploadTarget;
  success: number;
  failures: string[];
  lastId: number;
  replacedProfile: boolean;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/** 가족이 올릴 수 있는 사진 수(프로필 사진 포함). 서버 routers/gallery.ts 와 같다. */
export const MEMBER_PHOTO_LIMIT = 30;

/** 휴대폰·태블릿처럼 손가락으로 쓰는 기기인지. "지금 사진 찍기"는 여기서만 보인다. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return coarse;
}

export function uploadFailureReason(error: unknown) {
  if (error instanceof TRPCClientError) {
    const code = error.data?.code;
    if (code === "FORBIDDEN") {
      return "사진을 바꿀 권한이 없습니다. 추모관을 만든 가족, 초대받은 가족, 관리자만 올릴 수 있습니다.";
    }
    if (code === "PAYLOAD_TOO_LARGE") {
      return "사진이 너무 큽니다. 화면을 새로고침한 뒤 다시 올려 주세요. 올리실 때 자동으로 줄여서 올립니다.";
    }
    if (
      code === "BAD_REQUEST" &&
      error.message &&
      !error.message.trim().startsWith("[")
    ) {
      return error.message;
    }
    return "인터넷 연결을 확인한 뒤 다시 올려 주세요.";
  }
  if (error instanceof Error && error.message.includes("열 수 없습니다")) {
    return "이 사진은 열 수 없는 형식입니다. JPG·PNG 사진을 고르거나, 휴대폰 카메라 설정에서 '호환성 우선'으로 바꿔 주세요.";
  }
  if (error instanceof Error && error.message.includes("충분히 줄이지 못했습니다")) {
    return error.message;
  }
  return "사진을 올리지 못했습니다. 인터넷 연결을 확인해 주세요.";
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

export default function MemorialGallerySection({
  memorialId,
  isAdmin,
  accessToken,
}: MemorialGallerySectionProps) {
  const utils = trpc.useUtils();
  const sectionRef = useRef<HTMLElement>(null);
  const jumpedToMemorial = useRef<number | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const profileCameraRef = useRef<HTMLInputElement>(null);
  const albumFileRef = useRef<HTMLInputElement>(null);
  const albumCameraRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const uploadInProgress = useRef(false);
  const coarsePointer = useCoarsePointer();
  const { user } = useAuth();
  const permissions = trpc.gallery.permissions.useQuery(
    { memorialId },
    { enabled: Boolean(user) && memorialId > 0, retry: false }
  );

  const listInput = { memorialId, accessToken: accessToken || undefined };
  const photosQuery = trpc.gallery.listByMemorial.useQuery(listInput);
  const photos = (photosQuery.data ?? []) as GalleryPhoto[];
  const profilePhoto =
    photos.find(photo => photo.isRepresentative === 1) ?? null;
  const albumPhotos = photos.filter(photo => photo.isRepresentative !== 1);
  const canEdit =
    Boolean(user) && memorialId > 0 && permissions.data?.canManage === true;
  const uploading = progress !== null;

  useEffect(() => {
    if (
      window.location.hash !== "#gallery" ||
      photosQuery.isLoading ||
      (user && permissions.isLoading) ||
      jumpedToMemorial.current === memorialId
    )
      return;
    const section = sectionRef.current;
    if (!section) return;
    // This section arrives after the initial page load, so native fragment scrolling is too early.
    jumpedToMemorial.current = memorialId;
    section.scrollIntoView({ block: "start" });
    section.focus({ preventScroll: true });
  }, [
    memorialId,
    photosQuery.isLoading,
    permissions.isLoading,
    canEdit,
    photos.length,
  ]);

  useEffect(() => {
    if (highlightId === null) return;
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const uploadPhoto = trpc.gallery.upload.useMutation();
  const updatePhoto = trpc.gallery.update.useMutation({
    onSuccess: () => utils.gallery.listByMemorial.invalidate(listInput),
    onError: error => toast.error(error.message),
  });
  const deletePhoto = trpc.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("사진을 지웠습니다.");
      utils.gallery.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });
  const setRepresentative = trpc.gallery.setRepresentative.useMutation({
    onSuccess: () => {
      toast.success(
        profilePhoto
          ? "프로필 사진으로 정했습니다. 전에 쓰던 사진은 앨범으로 옮겼습니다."
          : "프로필 사진으로 정했습니다."
      );
      utils.gallery.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });

  const processFiles = async (files: File[], target: UploadTarget) => {
    if (!canEdit || files.length === 0 || uploadInProgress.current) return;
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      setResult({
        target,
        success: 0,
        failures: ["사진 파일만 올릴 수 있습니다."],
        lastId: 0,
        replacedProfile: false,
      });
      toast.error("사진 파일만 올릴 수 있습니다.");
      return;
    }

    // 프로필 사진은 한 장이다. 여러 장을 골랐으면 첫 장만 쓴다.
    const selected = target === "profile" ? imageFiles.slice(0, 1) : imageFiles;
    const replacedProfile = target === "profile" && profilePhoto !== null;
    uploadInProgress.current = true;
    setResult(null);
    setProgress({ target, done: 0, total: selected.length });
    let success = 0;
    let lastId = 0;
    const failures: string[] = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        try {
          const compressed = await compressImageFile(file);
          const thumbDataUrl = await makeThumbnailDataUrl(file);
          const uploaded = await uploadPhoto.mutateAsync({
            memorialId,
            dataUrl: compressed.dataUrl,
            thumbDataUrl,
            fileName: compressed.fileName,
            sortOrder: albumPhotos.length + index,
            asProfile: target === "profile",
          });
          success += 1;
          if (uploaded.id) lastId = uploaded.id;
        } catch (error) {
          failures.push(
            `${file.name || `${index + 1}번째 사진`}: ${uploadFailureReason(error)}`
          );
        }
        setProgress({ target, done: index + 1, total: selected.length });
      }

      await utils.gallery.listByMemorial.invalidate(listInput);
      setResult({ target, success, failures, lastId, replacedProfile });
      if (success > 0) {
        toast.success(
          target === "profile"
            ? "프로필 사진을 올렸습니다."
            : `사진 ${success}장을 앨범에 올렸습니다.`
        );
      }
      if (failures.length > 0) {
        toast.error(
          `${failures.length}장을 올리지 못했습니다. 안내를 확인해 주세요.`
        );
      }
    } finally {
      uploadInProgress.current = false;
      setProgress(null);
    }
  };

  const showUploadedPhoto = (lastId: number) => {
    const target =
      (lastId && document.getElementById(`gallery-photo-${lastId}`)) ||
      document.querySelector<HTMLElement>(
        "#gallery [data-album-photo]:last-of-type"
      );
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    if (lastId) setHighlightId(lastId);
  };

  const movePhoto = async (index: number, direction: -1 | 1) => {
    if (!canEdit) return;
    const target = index + direction;
    if (target < 0 || target >= albumPhotos.length) return;

    const next = [...albumPhotos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await Promise.all(
      next.map((photo, sortOrder) =>
        updatePhoto.mutateAsync({ id: photo.id, sortOrder })
      )
    );
    await utils.gallery.listByMemorial.invalidate(listInput);
    toast.success("사진 순서를 바꿨습니다.");
  };

  if (!photosQuery.isLoading && albumPhotos.length === 0 && !canEdit)
    return null;

  const pickerInput = (
    ref: RefObject<HTMLInputElement | null>,
    target: UploadTarget,
    options: { multiple?: boolean; camera?: boolean }
  ) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple={options.multiple}
      {...(options.camera ? { capture: "environment" as const } : {})}
      className="hidden"
      onChange={event => {
        void processFiles(Array.from(event.target.files || []), target);
        event.target.value = "";
      }}
    />
  );

  return (
    <section
      ref={sectionRef}
      id="gallery"
      tabIndex={-1}
      aria-label="앨범"
      className="relative scroll-mt-20 overflow-hidden py-20 outline-none md:py-32"
      style={{
        background: "linear-gradient(180deg, #ffffff, #ffffff, #ffffff)",
      }}
      onDragOver={event => {
        event.preventDefault();
        if (canEdit) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        void processFiles(Array.from(event.dataTransfer.files), "album");
      }}
    >
      <div className="container">
        <SectionHeading
          eyebrow="Photo Album"
          title="앨범"
          description={
            canEdit
              ? "추모관 맨 위에 보일 프로필 사진과, 함께 남길 앨범 사진을 이곳에서 올립니다."
              : "가족이 남긴 사진과 소중한 순간들을 담았습니다."
          }
        />

        {canEdit && (
          <div className="mx-auto mb-10 grid max-w-5xl gap-4 text-left md:grid-cols-2">
            <div
              id="profile-photo"
              className="scroll-mt-28 border border-[#dedede] bg-white p-5"
            >
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#666666]">
                Profile
              </p>
              <h3 className="mt-1 text-xl" style={serifStyle}>
                프로필 사진
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#555555]">
                추모관 맨 위, 부고장, 키오스크에 크게 보이는 사진입니다. 한 장만
                정할 수 있습니다. 얼굴이 잘 보이는 세로 사진이 좋습니다.
              </p>
              <div className="mt-4 flex gap-4">
                <div className="flex aspect-[4/5] w-28 shrink-0 items-center justify-center overflow-hidden border border-[#dedede] bg-[#f5f5f5]">
                  {profilePhoto ? (
                    <ThumbImage
                      src={profilePhoto.photoUrl}
                      alt="지금 쓰는 프로필 사진"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound
                      className="h-9 w-9 text-[#9a9a9a]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-sm leading-6 text-[#171717]">
                    {profilePhoto
                      ? "지금 쓰는 프로필 사진입니다."
                      : "아직 프로필 사진이 없습니다."}
                  </p>
                  <UploadButton
                    disabled={uploading}
                    onClick={() => profileFileRef.current?.click()}
                    icon={<ImagePlus className="h-4 w-4" />}
                    primary
                  >
                    {profilePhoto ? "다른 사진으로 바꾸기" : "사진 고르기"}
                  </UploadButton>
                  {coarsePointer && (
                    <UploadButton
                      disabled={uploading}
                      onClick={() => profileCameraRef.current?.click()}
                      icon={<Camera className="h-4 w-4" />}
                    >
                      지금 사진 찍기
                    </UploadButton>
                  )}
                  {profilePhoto && (
                    <button
                      type="button"
                      disabled={uploading || deletePhoto.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            "프로필 사진을 지울까요? 지우면 추모관 맨 위에는 성함 첫 글자가 보입니다."
                          )
                        ) {
                          deletePhoto.mutate({ id: profilePhoto.id });
                        }
                      }}
                      className="self-start text-sm text-[#9f2a2a] underline underline-offset-4 disabled:opacity-50"
                    >
                      프로필 사진 지우기
                    </button>
                  )}
                </div>
              </div>
              {result?.target === "profile" && (
                <UploadResultBox result={result} />
              )}
              {pickerInput(profileFileRef, "profile", {})}
              {pickerInput(profileCameraRef, "profile", { camera: true })}
            </div>

            <div className="border border-[#dedede] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#666666]">
                Album
              </p>
              <h3 className="mt-1 text-xl" style={serifStyle}>
                앨범 사진
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#555555]">
                여러 장을 한 번에 고를 수 있습니다. 올린 사진은 아래 앨범 맨
                끝에 붙습니다.
                {isAdmin
                  ? ""
                  : ` 프로필 사진을 합쳐 ${MEMBER_PHOTO_LIMIT}장까지 올릴 수 있습니다.`}
              </p>
              <p className="mt-3 text-sm font-medium text-[#171717]">
                지금 앨범 사진 {albumPhotos.length}장
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <UploadButton
                  disabled={uploading}
                  onClick={() => albumFileRef.current?.click()}
                  icon={<ImagePlus className="h-4 w-4" />}
                  primary
                >
                  사진 고르기 (여러 장)
                </UploadButton>
                {coarsePointer && (
                  <UploadButton
                    disabled={uploading}
                    onClick={() => albumCameraRef.current?.click()}
                    icon={<Camera className="h-4 w-4" />}
                  >
                    지금 사진 찍기
                  </UploadButton>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#666666]">
                큰 사진은 자동으로 줄여서 올립니다. 함께 찍힌 분의 공개 동의도
                확인해 주세요.
              </p>
              {result?.target === "album" && (
                <UploadResultBox
                  result={result}
                  onShowPhoto={() => showUploadedPhoto(result.lastId)}
                />
              )}
              {pickerInput(albumFileRef, "album", { multiple: true })}
              {pickerInput(albumCameraRef, "album", { camera: true })}
            </div>
          </div>
        )}

        {dragging && canEdit && (
          <div className="absolute inset-4 z-30 flex items-center justify-center border-2 border-dashed border-[#bcbcbc] bg-white/92">
            <div className="text-center text-[#555555]">
              <Upload className="mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-medium">
                사진을 여기에 놓으면 앨범에 올라갑니다.
              </p>
            </div>
          </div>
        )}

        {photosQuery.isLoading ? (
          <EmptyState text="사진을 불러오고 있습니다." />
        ) : albumPhotos.length > 0 ? (
          <AlbumPhotoGrid
            photos={albumPhotos}
            canEdit={canEdit}
            highlightId={highlightId}
            photoElementId={photo => `gallery-photo-${photo.id}`}
            onOpen={setLightboxIndex}
            onMove={movePhoto}
            onDelete={photo => {
              if (confirm("이 사진을 지울까요?")) {
                deletePhoto.mutate({ id: photo.id });
              }
            }}
            onSaveCaption={(photo, caption) =>
              updatePhoto.mutateAsync({ id: photo.id, caption })
            }
            onSaveYear={(photo, year) =>
              updatePhoto.mutateAsync({ id: photo.id, year })
            }
            renderExtraActions={photo => (
              <IconButton
                label="프로필 사진으로 정하기"
                onClick={() =>
                  setRepresentative.mutate({ memorialId, id: photo.id })
                }
              >
                <Star className="h-3.5 w-3.5" />
              </IconButton>
            )}
          />
        ) : (
          <button
            type="button"
            className="w-full border border-dashed border-[#dedede] bg-white px-4 py-16 text-center text-sm leading-6 text-[#666666]"
            onClick={() => albumFileRef.current?.click()}
          >
            앨범에 올린 사진이 아직 없습니다.
            <br />
            눌러서 사진을 골라 주세요.
          </button>
        )}
      </div>

      {progress && <UploadProgressBar progress={progress} />}

      {lightboxIndex !== null && albumPhotos[lightboxIndex] && (
        <PhotoLightbox
          photos={albumPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex(value => Math.max(0, (value ?? 0) - 1))
          }
          onNext={() =>
            setLightboxIndex(value =>
              Math.min(albumPhotos.length - 1, (value ?? 0) + 1)
            )
          }
        />
      )}
    </section>
  );
}

export function UploadButton({
  children,
  disabled,
  icon,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-2 px-4 text-base font-medium transition-opacity disabled:opacity-50 ${
        primary
          ? "bg-[#171717] text-white hover:opacity-90"
          : "border border-[#bcbcbc] bg-white text-[#171717] hover:bg-[#f9f9f9]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function UploadResultBox({
  result,
  onShowPhoto,
  albumLabel = "앨범",
}: {
  result: UploadResult;
  onShowPhoto?: () => void;
  /** "사진 3장을 ○○에 올렸습니다." 의 ○○. 가족관은 "가족관". */
  albumLabel?: string;
}) {
  const hasFailures = result.failures.length > 0;
  return (
    <div
      role={hasFailures ? "alert" : "status"}
      className={`mt-4 border p-3 text-sm leading-6 ${
        hasFailures
          ? "border-amber-300 bg-amber-50"
          : "border-[#bcd9c5] bg-[#f1f8f3]"
      }`}
    >
      {result.success > 0 && (
        <p className="flex items-start gap-2 font-medium text-[#2f6f4f]">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {result.target === "profile"
              ? `프로필 사진을 올렸습니다. 추모관 맨 위에 보입니다.${
                  result.replacedProfile
                    ? " 전에 쓰던 사진은 앨범에 남겨 두었습니다."
                    : ""
                }`
              : `사진 ${result.success}장을 ${albumLabel}에 올렸습니다.`}
          </span>
        </p>
      )}
      {hasFailures && (
        <>
          <p className="font-medium text-[#7a4b00]">
            올리지 못한 사진 {result.failures.length}장
          </p>
          <ul className="mt-1 list-inside list-disc break-words text-[#5c4300]">
            {result.failures.map((failure, index) => (
              <li key={index}>{failure}</li>
            ))}
          </ul>
        </>
      )}
      {result.success > 0 && onShowPhoto && (
        <button
          type="button"
          onClick={onShowPhoto}
          className="mt-2 min-h-11 text-sm font-medium text-[#171717] underline underline-offset-4"
        >
          올린 사진 보러 가기
        </button>
      )}
    </div>
  );
}

/** 손가락을 이만큼(px) 옆으로 밀면 다음·이전 사진으로 넘긴다. */
export const LIGHTBOX_SWIPE_MIN_PX = 50;

/**
 * 밀기 방향을 판단한다. 옆으로 충분히, 그리고 위아래보다 더 크게 밀었을 때만
 * 넘긴다. 왼쪽으로 밀면 다음 사진(1), 오른쪽으로 밀면 이전 사진(-1).
 */
export function lightboxSwipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < LIGHTBOX_SWIPE_MIN_PX) return 0;
  if (Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
  altFallback = "앨범 사진",
}: {
  photos: AlbumPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  altFallback?: string;
}) {
  const photo = photos[index];
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  // 사진 창이 떠 있는 동안 뒤 화면이 손가락에 밀려 움직이지 않게 한다.
  useScrollLock();
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  // PC 에서는 ← → 로 넘기고 Esc 로 닫는다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onPrev();
      else if (event.key === "ArrowRight") onNext();
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev]);

  // 사진 위에서도 잘 보이게 흰 바탕·검은 테두리·그림자 (2026-09-16 "화살표가 안 보인다").
  const arrowClass =
    "memorial-lightbox-arrow absolute top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#171717] bg-white text-[#171717] shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-transform active:scale-95 disabled:opacity-0";

  return (
    <div
      className="memorial-lightbox fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#3d2b1b]/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        className="memorial-lightbox-close absolute right-4 top-4 z-10 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#171717] bg-white px-4 text-base font-medium text-[#171717] shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
        닫기
      </button>

      <div
        className="max-h-[86vh] w-full max-w-5xl overflow-hidden border border-white/15 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        {/* 사진 위에서 손가락을 옆으로 밀면 넘어가고, 화살표는 사진 가운데 양옆에 둔다
            (2026-09-16 요청). 위아래 밀기는 화면에 맡긴다. */}
        <div
          className="relative touch-pan-y select-none"
          onPointerDown={event => {
            swipeStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={event => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (!start) return;
            const direction = lightboxSwipeDirection(
              event.clientX - start.x,
              event.clientY - start.y
            );
            if (direction === 1) onNext();
            if (direction === -1) onPrev();
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          <img
            src={toImgUrl(photo.photoUrl)}
            alt={photo.caption || altFallback}
            draggable={false}
            className="max-h-[74vh] w-full object-contain"
          />
          <button
            type="button"
            className={`${arrowClass} left-3`}
            onClick={event => {
              event.stopPropagation();
              onPrev();
            }}
            disabled={!hasPrev}
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-9 w-9" strokeWidth={2.75} />
          </button>
          <button
            type="button"
            className={`${arrowClass} right-3`}
            onClick={event => {
              event.stopPropagation();
              onNext();
            }}
            disabled={!hasNext}
            aria-label="다음 사진"
          >
            <ChevronRight className="h-9 w-9" strokeWidth={2.75} />
          </button>
        </div>
        <div className="border-t border-[#dedede] bg-white px-5 py-4 text-center">
          {photo.caption && (
            <p className="text-sm text-[#171717]">{photo.caption}</p>
          )}
          {photo.year && (
            <p className="mt-1 text-xs text-[#666666]">{photo.year}</p>
          )}
          <p className="mt-1 text-xs text-[#666666]">
            {index + 1} / {photos.length} · 옆으로 밀어도 넘어갑니다
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="memorial-section-heading">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#666666]">
        {eyebrow}
      </p>
      <h2
        className="text-balance break-keep text-3xl font-light [overflow-wrap:anywhere] md:text-4xl"
        style={serifStyle}
      >
        {title}
      </h2>
      <p className="mt-4 text-pretty break-keep text-sm leading-7 text-[#666666] [overflow-wrap:anywhere]">
        {description}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
      {text}
    </div>
  );
}

export function IconButton({
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
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center border shadow-sm transition-colors disabled:opacity-35 ${
        danger
          ? "border-red-200 bg-red-500 text-white hover:bg-red-600"
          : "border-[#dedede] bg-white/90 text-[#555555] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 앨범 사진 격자 (2026-09-16 가족관과 같이 쓰려고 떼어 냄). 다섯 장마다 한 장을
 * 크게 두고, 설명·연도는 사진 위에 얹는다. canEdit 이면 순서·삭제 단추와
 * 설명·연도 고치기 칸이 붙는다. layout="narrow" 는 폭이 좁은 관리 화면용으로
 * 한 줄에 놓는 칸 수만 줄인다.
 */
export function AlbumPhotoGrid<Photo extends AlbumPhoto>({
  photos,
  canEdit,
  onOpen,
  onMove,
  onDelete,
  onSaveCaption,
  onSaveYear,
  renderExtraActions,
  photoElementId,
  highlightId = null,
  altFallback = "앨범 사진",
  layout = "wide",
}: {
  photos: Photo[];
  canEdit: boolean;
  onOpen: (index: number) => void;
  onMove?: (index: number, direction: -1 | 1) => void;
  onDelete?: (photo: Photo) => void;
  onSaveCaption?: (photo: Photo, caption: string) => Promise<unknown> | void;
  onSaveYear?: (photo: Photo, year: string) => Promise<unknown> | void;
  renderExtraActions?: (photo: Photo, index: number) => ReactNode;
  photoElementId?: (photo: Photo) => string;
  highlightId?: number | null;
  altFallback?: string;
  layout?: "wide" | "narrow";
}) {
  const gridClass =
    layout === "narrow"
      ? canEdit
        ? "grid auto-rows-[240px] grid-cols-1 gap-3 sm:grid-cols-2"
        : "grid auto-rows-[170px] grid-cols-2 gap-3"
      : `grid gap-3 md:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:grid-cols-4 ${canEdit ? "auto-rows-[240px] grid-cols-1 sm:grid-cols-2" : "auto-rows-[170px] grid-cols-2"}`;

  return (
    <div className={gridClass}>
      {photos.map((photo, index) => (
        <article
          key={photo.id}
          id={photoElementId?.(photo)}
          data-album-photo
          className={`group relative overflow-hidden bg-white shadow-[0_10px_30px_rgba(31,29,26,0.05)] ${
            highlightId === photo.id
              ? "outline outline-4 outline-offset-2 outline-[#2f6f4f]"
              : ""
          }`}
          style={{
            gridRow: index % 5 === 0 ? "span 2" : "span 1",
            border: "1px solid #dedede",
          }}
        >
          <button
            type="button"
            className="h-full w-full text-left"
            onClick={() => onOpen(index)}
          >
            <ThumbImage
              src={photo.photoUrl}
              alt={photo.caption || altFallback}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-[#171717]/0 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-[#171717]/75" />
            {(photo.caption || photo.year) && (
              <span className="absolute bottom-0 left-0 right-0 translate-y-0 bg-gradient-to-t from-[#171717]/80 to-transparent p-4 text-white transition-transform duration-500 ">
                {photo.caption && (
                  <span className="block text-sm">{photo.caption}</span>
                )}
                {photo.year && (
                  <span className="mt-1 block text-xs text-white/75">
                    {photo.year}
                  </span>
                )}
              </span>
            )}
          </button>

          {canEdit && (
            <>
              <div className="absolute right-2 top-2 z-10 flex gap-1">
                {renderExtraActions?.(photo, index)}
                <IconButton
                  label="앞으로"
                  disabled={index === 0}
                  onClick={() => onMove?.(index, -1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="뒤로"
                  disabled={index === photos.length - 1}
                  onClick={() => onMove?.(index, 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="삭제"
                  danger
                  onClick={() => onDelete?.(photo)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>

              <div
                className="absolute bottom-2 left-2 right-2 z-10 border border-[#dedede] bg-white/95 p-2 text-xs shadow-sm"
                onClick={event => event.stopPropagation()}
              >
                <InlineEditText
                  value={photo.caption || ""}
                  isAdmin
                  placeholder="사진 설명"
                  onSave={caption => onSaveCaption?.(photo, caption)}
                />
                <div className="mt-1 text-[#666666]">
                  <InlineEditText
                    value={photo.year || ""}
                    isAdmin
                    placeholder="연도"
                    onSave={year => onSaveYear?.(photo, year)}
                  />
                </div>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

/** 사진을 올리는 동안 화면 아래에 붙는 진행 막대. */
export function UploadProgressBar({ progress }: { progress: UploadProgress }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#dedede] bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="mx-auto max-w-xl">
        <p className="text-base font-medium text-[#171717]">
          {progress.target === "profile"
            ? "프로필 사진을 올리는 중입니다"
            : `사진을 올리는 중입니다 · ${Math.min(progress.done + 1, progress.total)} / ${progress.total}장`}
        </p>
        <div className="mt-2 h-2 bg-[#eeeeee]">
          <div
            className="h-full bg-[#171717] transition-all"
            style={{
              width: `${Math.max(8, Math.round((progress.done / progress.total) * 100))}%`,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-[#666666]">
          다 올라갈 때까지 화면을 닫지 말고 잠시 기다려 주세요.
        </p>
      </div>
    </div>
  );
}
