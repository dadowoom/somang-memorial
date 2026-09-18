import {
  compressImageFile,
  makeThumbnailDataUrl,
} from "@/lib/imageCompression";
import { trpc } from "@/lib/trpc";
import { Camera, ImagePlus, Upload } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlbumPhotoGrid,
  PhotoLightbox,
  UploadButton,
  UploadProgressBar,
  UploadResultBox,
  isImageFile,
  uploadFailureReason,
  useCoarsePointer,
  type AlbumPhoto,
  type UploadProgress,
  type UploadResult,
} from "./MemorialGallerySection";

/**
 * 가족관 사진 (2026-09-16 결정: 가족관 앨범도 추모관 앨범과 같은 방식으로).
 * 격자·크게 보기 창·올리기 단추·진행 막대·결과 안내는 추모관 앨범 부품을 그대로
 * 쓰고, 저장만 가족관 통로(familyRoom.*)로 한다. 가족관 사진은 비밀번호를 아는
 * 가족만 보고, 공개 추모관 앨범에는 섞이지 않는다.
 */

const FAMILY_PHOTO_ALT = "가족관 사진";

/** 방문 화면(홈페이지 가족관·키오스크 가족관)의 가족관 사진. 누르면 크게 보인다. */
export function FamilyPhotoGallery({ photos }: { photos: AlbumPhoto[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <AlbumPhotoGrid
        photos={photos}
        canEdit={false}
        onOpen={setLightboxIndex}
        altFallback={FAMILY_PHOTO_ALT}
      />
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          altFallback={FAMILY_PHOTO_ALT}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex(value => Math.max(0, (value ?? 0) - 1))
          }
          onNext={() =>
            setLightboxIndex(value =>
              Math.min(photos.length - 1, (value ?? 0) + 1)
            )
          }
        />
      )}
    </>
  );
}

/** 가족관 관리 화면에서 사진을 올리고, 설명·연도를 적고, 순서를 바꾸고, 지운다. */
export function FamilyPhotoManager({
  slug,
  photos,
  photoLimit,
  onSaved,
}: {
  slug: string;
  photos: AlbumPhoto[];
  photoLimit: number;
  onSaved: () => Promise<unknown> | void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadInProgress = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const coarsePointer = useCoarsePointer();

  const addPhoto = trpc.familyRoom.addPhoto.useMutation();
  const updatePhoto = trpc.familyRoom.updatePhoto.useMutation({
    onSuccess: () => onSaved(),
    onError: error => toast.error(error.message),
  });
  const deletePhoto = trpc.familyRoom.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("사진을 지웠습니다.");
      void onSaved();
    },
    onError: error => toast.error(error.message),
  });
  const reorderPhotos = trpc.familyRoom.reorderPhotos.useMutation({
    onSuccess: () => {
      toast.success("사진 순서를 바꿨습니다.");
      void onSaved();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (highlightId === null) return;
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const uploading = progress !== null;
  const full = photos.length >= photoLimit;

  const processFiles = async (files: File[]) => {
    if (files.length === 0 || uploadInProgress.current) return;
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      setResult({
        target: "album",
        success: 0,
        failures: ["사진 파일만 올릴 수 있습니다."],
        lastId: 0,
        replacedProfile: false,
      });
      toast.error("사진 파일만 올릴 수 있습니다.");
      return;
    }

    uploadInProgress.current = true;
    setResult(null);
    setProgress({ target: "album", done: 0, total: imageFiles.length });
    let success = 0;
    const failures: string[] = [];

    try {
      // 추모관 앨범처럼 한 장씩 차례로 올린다. 한 장이 실패해도 나머지는 계속 올린다.
      for (let index = 0; index < imageFiles.length; index += 1) {
        const file = imageFiles[index];
        try {
          const compressed = await compressImageFile(file);
          const thumbDataUrl = await makeThumbnailDataUrl(file);
          await addPhoto.mutateAsync({
            memorialSlug: slug,
            dataUrl: compressed.dataUrl,
            thumbDataUrl,
            fileName: compressed.fileName,
          });
          success += 1;
        } catch (error) {
          failures.push(
            `${file.name || `${index + 1}번째 사진`}: ${uploadFailureReason(error)}`
          );
        }
        setProgress({
          target: "album",
          done: index + 1,
          total: imageFiles.length,
        });
      }

      await onSaved();
      setResult({
        target: "album",
        success,
        failures,
        lastId: 0,
        replacedProfile: false,
      });
      if (success > 0) {
        toast.success(`사진 ${success}장을 가족관에 올렸습니다.`);
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

  // 새 사진은 맨 끝에 붙으므로 마지막 사진으로 데려간다.
  const showUploadedPhoto = () => {
    const last = photos[photos.length - 1];
    const target =
      (last && document.getElementById(`family-photo-${last.id}`)) ||
      document.querySelector<HTMLElement>(
        "#family-photos [data-album-photo]:last-of-type"
      );
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    if (last) setHighlightId(last.id);
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length || reorderPhotos.isPending) {
      return;
    }
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    reorderPhotos.mutate({
      memorialSlug: slug,
      photoIds: next.map(photo => photo.id),
    });
  };

  const pickerInput = (
    ref: RefObject<HTMLInputElement | null>,
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
        void processFiles(Array.from(event.target.files || []));
        event.target.value = "";
      }}
    />
  );

  return (
    <section
      id="family-photos"
      className="relative mt-12 scroll-mt-28"
      onDragOver={event => {
        event.preventDefault();
        if (!full) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!full) void processFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        가족 사진
      </h2>
      <p className="mt-4 text-base leading-7 text-[#616161]">
        여기에 올린 사진은 이 가족관에만 저장되어 비밀번호를 아는 가족만 볼 수
        있습니다. 공개 추모관 앨범에는 나오지 않습니다.
      </p>

      <div className="mt-6 border border-[#dedede] bg-white p-5">
        <p className="text-sm font-medium text-[#171717]">
          지금 가족관 사진 {photos.length}장
        </p>
        <p className="mt-2 text-sm leading-6 text-[#555555]">
          여러 장을 한 번에 고를 수 있습니다. 올린 사진은 아래 맨 끝에 붙습니다.{" "}
          {photoLimit}장까지 올릴 수 있습니다.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <UploadButton
            disabled={uploading || full}
            onClick={() => fileRef.current?.click()}
            icon={<ImagePlus className="h-4 w-4" />}
            primary
          >
            {full ? "사진이 가득 찼습니다" : "사진 고르기 (여러 장)"}
          </UploadButton>
          {coarsePointer && !full && (
            <UploadButton
              disabled={uploading}
              onClick={() => cameraRef.current?.click()}
              icon={<Camera className="h-4 w-4" />}
            >
              지금 사진 찍기
            </UploadButton>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#666666]">
          큰 사진은 자동으로 줄여서 올립니다. 올린 사진 아래 칸을 눌러 설명과
          연도를 적고, 화살표로 순서를 바꿀 수 있습니다.
        </p>
        {result && (
          <UploadResultBox
            result={result}
            albumLabel="가족관"
            onShowPhoto={showUploadedPhoto}
          />
        )}
        {pickerInput(fileRef, { multiple: true })}
        {pickerInput(cameraRef, { camera: true })}
      </div>

      {dragging && !full && (
        <div className="absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-[#bcbcbc] bg-white/92">
          <div className="text-center text-[#555555]">
            <Upload className="mx-auto mb-3 h-10 w-10" />
            <p className="text-sm font-medium">
              사진을 여기에 놓으면 가족관에 올라갑니다.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {photos.length > 0 ? (
          <AlbumPhotoGrid
            photos={photos}
            canEdit
            layout="narrow"
            highlightId={highlightId}
            photoElementId={photo => `family-photo-${photo.id}`}
            altFallback={FAMILY_PHOTO_ALT}
            onOpen={setLightboxIndex}
            onMove={movePhoto}
            onDelete={photo => {
              if (confirm("이 사진을 가족관에서 지울까요?")) {
                deletePhoto.mutate({ memorialSlug: slug, photoId: photo.id });
              }
            }}
            onSaveCaption={(photo, caption) =>
              updatePhoto.mutateAsync({
                memorialSlug: slug,
                photoId: photo.id,
                caption,
              })
            }
            onSaveYear={(photo, year) =>
              updatePhoto.mutateAsync({
                memorialSlug: slug,
                photoId: photo.id,
                year,
              })
            }
          />
        ) : (
          <button
            type="button"
            disabled={uploading}
            className="w-full border border-dashed border-[#dedede] bg-white px-4 py-16 text-center text-sm leading-6 text-[#666666]"
            onClick={() => fileRef.current?.click()}
          >
            가족관에 올린 사진이 아직 없습니다.
            <br />
            눌러서 사진을 골라 주세요.
          </button>
        )}
      </div>

      {progress && <UploadProgressBar progress={progress} />}

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          altFallback={FAMILY_PHOTO_ALT}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex(value => Math.max(0, (value ?? 0) - 1))
          }
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
