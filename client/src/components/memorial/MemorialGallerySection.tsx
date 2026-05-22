import InlineEditText from "@/components/InlineEditText";
import { compressImageFile } from "@/lib/imageCompression";
import { toImgUrl } from "@/lib/imageUrl";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

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

type MemorialGallerySectionProps = {
  memorialId: number;
  isAdmin: boolean;
};

const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";

export default function MemorialGallerySection({
  memorialId,
  isAdmin,
}: MemorialGallerySectionProps) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const photosQuery = trpc.gallery.listByMemorial.useQuery({ memorialId });
  const photos = (photosQuery.data ?? []) as GalleryPhoto[];
  const canEdit = isAdmin && memorialId > 0;

  const uploadPhoto = trpc.gallery.upload.useMutation();
  const updatePhoto = trpc.gallery.update.useMutation({
    onSuccess: () => utils.gallery.listByMemorial.invalidate({ memorialId }),
    onError: error => toast.error(error.message),
  });
  const deletePhoto = trpc.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("사진이 삭제되었습니다.");
      utils.gallery.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const setRepresentative = trpc.gallery.setRepresentative.useMutation({
    onSuccess: () => {
      toast.success("대표사진으로 지정했습니다.");
      utils.gallery.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });

  const processFiles = async (files: File[]) => {
    if (!canEdit || files.length === 0) return;
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploading(true);
    setProgress(0);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (let index = 0; index < imageFiles.length; index += 1) {
        try {
          const compressed = await compressImageFile(imageFiles[index]);
          await uploadPhoto.mutateAsync({
            memorialId,
            dataUrl: compressed.dataUrl,
            fileName: compressed.fileName,
            sortOrder: photos.length + index,
          });
          successCount += 1;
        } catch {
          failureCount += 1;
        }
        setProgress(Math.round(((index + 1) / imageFiles.length) * 100));
      }

      await utils.gallery.listByMemorial.invalidate({ memorialId });
      if (successCount > 0) {
        toast.success(`${successCount}장의 사진이 업로드되었습니다.`);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount}장의 사진 업로드에 실패했습니다.`);
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const movePhoto = async (index: number, direction: -1 | 1) => {
    if (!canEdit) return;
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;

    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await Promise.all(
      next.map((photo, sortOrder) =>
        updatePhoto.mutateAsync({ id: photo.id, sortOrder })
      )
    );
    await utils.gallery.listByMemorial.invalidate({ memorialId });
    toast.success("사진 순서가 변경되었습니다.");
  };

  if (!photosQuery.isLoading && photos.length === 0 && !canEdit) return null;

  return (
    <section
      id="gallery"
      className="relative overflow-hidden py-20 md:py-32"
      style={{
        background:
          "linear-gradient(180deg, #ffffff, #fbfaf8, #ffffff)",
      }}
      onDragOver={event => {
        event.preventDefault();
        if (canEdit) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        processFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(180,140,60,0.8) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="container">
        <SectionHeading
          eyebrow="Photo Gallery"
          title="신앙의 발걸음"
          description="가족이 남긴 사진과 소중한 순간들을 담은 기록입니다."
        />

        {canEdit && (
          <div className="mb-8 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 border border-dashed border-[#c8b383] bg-white px-5 text-sm font-medium text-[#4f4638] transition-colors hover:bg-[#faf9f7]"
            >
              <ImagePlus className="h-4 w-4" />
              사진 추가
            </button>
            <p className="mt-2 text-xs text-[#6f6a61]">
              여러 장을 한 번에 선택하거나 이 영역으로 끌어오세요.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={event => {
                processFiles(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />
          </div>
        )}

        {dragging && canEdit && (
          <div className="absolute inset-4 z-30 flex items-center justify-center border-2 border-dashed border-[#c8b383] bg-white/92">
            <div className="text-center text-[#4f4638]">
              <Upload className="mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-medium">사진을 여기에 놓으세요.</p>
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/85 backdrop-blur-sm">
            <div className="w-64 text-center">
              <div className="h-2 bg-white">
                <div
                  className="h-full bg-[#1f1d1a] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-[#6f5123]">업로드 중 {progress}%</p>
            </div>
          </div>
        )}

        {photosQuery.isLoading ? (
          <EmptyState text="사진을 불러오고 있습니다." />
        ) : photos.length > 0 ? (
          <div className="grid auto-rows-[170px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <article
                key={photo.id}
                  className="group relative overflow-hidden bg-white shadow-[0_10px_30px_rgba(31,29,26,0.05)]"
                  style={{
                    gridRow: index % 5 === 0 ? "span 2" : "span 1",
                    border: "1px solid #e6ded1",
                  }}
              >
                <button
                  type="button"
                  className="h-full w-full text-left"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={toImgUrl(photo.photoUrl)}
                    alt={photo.caption || "추모 사진"}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ filter: memorialPhotoFilter }}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#6f5123]/0 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-[#6f5123]/75" />
                  {(photo.caption || photo.year || photo.isRepresentative === 1) && (
                    <span className="absolute bottom-0 left-0 right-0 translate-y-0 bg-gradient-to-t from-[#6f5123]/80 to-transparent p-4 text-white transition-transform duration-500 md:translate-y-full md:group-hover:translate-y-0">
                      {photo.isRepresentative === 1 && (
                        <span className="mb-2 inline-flex items-center gap-1 text-[11px]">
                          <Star className="h-3 w-3 fill-white" />
                          대표사진
                        </span>
                      )}
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
                      <IconButton
                        label="대표사진"
                        onClick={() =>
                          setRepresentative.mutate({ memorialId, id: photo.id })
                        }
                      >
                        <Star className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="앞으로"
                        disabled={index === 0}
                        onClick={() => movePhoto(index, -1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="뒤로"
                        disabled={index === photos.length - 1}
                        onClick={() => movePhoto(index, 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="삭제"
                        danger
                        onClick={() => {
                          if (confirm("이 사진을 삭제하시겠습니까?")) {
                            deletePhoto.mutate({ id: photo.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>

                    <div
                      className="absolute bottom-2 left-2 right-2 z-10 border border-[#e6ded1] bg-white/95 p-2 text-xs shadow-sm"
                      onClick={event => event.stopPropagation()}
                    >
                      <InlineEditText
                        value={photo.caption || ""}
                        isAdmin
                        placeholder="사진 설명"
                        onSave={caption =>
                          updatePhoto.mutateAsync({ id: photo.id, caption })
                        }
                      />
                      <div className="mt-1 text-[#7a674a]">
                        <InlineEditText
                          value={photo.year || ""}
                          isAdmin
                          placeholder="연도"
                          onSave={year =>
                            updatePhoto.mutateAsync({ id: photo.id, year })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="w-full border border-dashed border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]"
            onClick={() => fileInputRef.current?.click()}
          >
            사진을 추가해 주세요.
          </button>
        )}
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(value => Math.max(0, (value ?? 0) - 1))}
          onNext={() =>
            setLightboxIndex(value =>
              Math.min(photos.length - 1, (value ?? 0) + 1)
            )
          }
        />
      )}
    </section>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3d2b1b]/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="absolute left-3 top-1/2 rounded-full border border-white/15 bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
        onClick={event => {
          event.stopPropagation();
          onPrev();
        }}
        disabled={index === 0}
        aria-label="이전 사진"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="absolute right-3 top-1/2 rounded-full border border-white/15 bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
        onClick={event => {
          event.stopPropagation();
          onNext();
        }}
        disabled={index === photos.length - 1}
        aria-label="다음 사진"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        className="max-h-[86vh] w-full max-w-5xl overflow-hidden border border-white/15 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <img
          src={toImgUrl(photo.photoUrl)}
          alt={photo.caption || "추모 사진"}
          className="max-h-[74vh] w-full object-contain"
          style={{ filter: memorialPhotoFilter }}
        />
        {(photo.caption || photo.year) && (
          <div className="border-t border-[#e6ded1] bg-white px-5 py-4 text-center">
            {photo.caption && <p className="text-sm text-[#2e2218]">{photo.caption}</p>}
            {photo.year && <p className="mt-1 text-xs text-[#7a674a]">{photo.year}</p>}
          </div>
        )}
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
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#7f673d]">
        {eyebrow}
      </p>
      <h2
        className="text-3xl font-light md:text-4xl"
        style={{ fontFamily: "'Noto Serif KR', serif" }}
      >
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[#6f6a61]">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
      {text}
    </div>
  );
}

function IconButton({
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
      className={`flex h-8 w-8 items-center justify-center border shadow-sm transition-colors disabled:opacity-35 ${
        danger
          ? "border-red-200 bg-red-500 text-white hover:bg-red-600"
          : "border-[#e6ded1] bg-white/90 text-[#4f4638] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
