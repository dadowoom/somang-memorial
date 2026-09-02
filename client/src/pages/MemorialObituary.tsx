import { formatLifespan } from "@/lib/lifespan";
import { toImgUrl } from "@/lib/imageUrl";
import { ORG_INFO } from "@/lib/orgInfo";
import { buildCalendarFile, parseServiceMoment } from "@/lib/serviceSchedule";
import { trpc } from "@/lib/trpc";
import { CalendarPlus, MapPin, Phone, Share2 } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const portraitFilter = "grayscale(1) contrast(1.04)";

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

type MemorialRecord = {
  id: number;
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  familyContact: string | null;
  familyPhone: string | null;
  verse: string | null;
  verseRef: string | null;
  summary: string;
  servicePlace: string | null;
  serviceTime: string | null;
  memorialDay: string | null;
  timeline: TimelineItem[];
};

type MemorialPhoto = {
  photoUrl: string;
  isRepresentative: number;
};

const getMemorialAccessStorageKey = (slug: string) =>
  `somang.memorialAccess.${slug}`;

const readStoredAccessToken = (slug: string) => {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(getMemorialAccessStorageKey(slug)) || "";
};

/** "2026-05-20" 을 "2026년 5월 20일" 로 보여줍니다. 다른 형식이면 그대로 둡니다. */
function formatKoreanDate(value?: string | null) {
  const text = (value ?? "").trim();
  const match = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/.exec(text);
  if (!match) return text;
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}

export default function MemorialObituary() {
  const [, params] = useRoute<{ slug: string }>("/memorial/:slug/obituary");
  const slug = params?.slug ?? "";
  const accessToken = readStoredAccessToken(slug);

  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );
  const memorial = memorialQuery.data as MemorialRecord | undefined;

  const photosQuery = trpc.gallery.listByMemorial.useQuery(
    { memorialId: memorial?.id ?? 0, accessToken: accessToken || undefined },
    { enabled: Boolean(memorial?.id) }
  );
  const photos = (photosQuery.data ?? []) as MemorialPhoto[];

  const isLocked = memorialQuery.error?.data?.code === "FORBIDDEN";

  return (
    <div className="min-h-screen bg-[#14130f] text-[#e8e4dc]">
      {memorialQuery.isLoading ? (
        <ObituaryNotice>부고장을 불러오고 있습니다.</ObituaryNotice>
      ) : isLocked ? (
        <ObituaryNotice>
          비공개 추모관입니다. 추모관에 먼저 입장한 뒤 부고장을 열어 주세요.
          <ObituaryNoticeLink slug={slug} />
        </ObituaryNotice>
      ) : memorialQuery.isError || !memorial ? (
        <ObituaryNotice>추모관을 찾을 수 없습니다.</ObituaryNotice>
      ) : !memorial.deathDate.trim() ? (
        <ObituaryNotice>
          아직 소천일이 입력되지 않아 부고장을 만들 수 없습니다.
          <ObituaryNoticeLink slug={slug} />
        </ObituaryNotice>
      ) : (
        <ObituarySheet memorial={memorial} photos={photos} />
      )}
    </div>
  );
}

function ObituaryNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <p className="max-w-sm text-sm leading-8 text-[#cfc9bb]">{children}</p>
    </div>
  );
}

function ObituaryNoticeLink({ slug }: { slug: string }) {
  return (
    <>
      <br />
      <Link
        href={`/memorial/${slug}`}
        className="mt-4 inline-block border-b border-[#6b6555] pb-1 text-[#e8e4dc]"
      >
        추모관으로 가기
      </Link>
    </>
  );
}

function ObituarySheet({
  memorial,
  photos,
}: {
  memorial: MemorialRecord;
  photos: MemorialPhoto[];
}) {
  const [shareMessage, setShareMessage] = useState("");

  const portrait =
    photos.find(photo => photo.isRepresentative === 1)?.photoUrl ??
    photos[0]?.photoUrl;
  const galleryPhotos = photos.slice(0, 3);
  const remainingPhotoCount = Math.max(0, photos.length - 3);

  const serviceMoment = useMemo(
    () => parseServiceMoment(memorial.serviceTime),
    [memorial.serviceTime]
  );

  const timeline = memorial.timeline.filter(
    item => item.year || item.title || item.description
  );

  const rows: Array<{ label: string; value: ReactNode }> = [];
  if (memorial.servicePlace?.trim())
    rows.push({ label: "빈소", value: memorial.servicePlace.trim() });
  if (memorial.serviceTime?.trim())
    rows.push({ label: "예배", value: memorial.serviceTime.trim() });
  if (memorial.memorialDay?.trim())
    rows.push({ label: "추도일", value: memorial.memorialDay.trim() });
  if (memorial.familyContact?.trim() || memorial.familyPhone?.trim())
    rows.push({
      label: "상주",
      value: (
        <>
          {memorial.familyContact?.trim()}
          {memorial.familyPhone?.trim() ? (
            <>
              {memorial.familyContact?.trim() ? <br /> : null}
              <span className="text-xs text-[#7d7666]">
                {memorial.familyPhone.trim()}
              </span>
            </>
          ) : null}
        </>
      ),
    });

  const handleSaveSchedule = () => {
    if (!serviceMoment) return;

    const memorialUrl = `${window.location.origin}/memorial/${memorial.slug}`;
    const file = buildCalendarFile({
      moment: serviceMoment,
      uid: memorial.slug,
      title: `${memorial.name} ${memorial.role} 추모예배`,
      location: memorial.servicePlace,
      description: `${ORG_INFO.serviceName} 온라인 추모관 ${memorialUrl}`,
    });

    const blob = new Blob([file], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${memorial.name}-추모예배.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/memorial/${memorial.slug}/obituary`;
    const title = `${memorial.church} ${memorial.name} ${memorial.role} 부고`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 공유창을 닫은 경우입니다. 아래 주소 복사로 넘어갑니다.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("부고장 주소를 복사했습니다.");
    } catch {
      setShareMessage("주소를 복사하지 못했습니다. 주소창을 복사해 주세요.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[420px] px-[22px] pb-10 pt-[22px]">
      <div className="border border-[#4a463c] pb-[30px]">
        <div className="flex flex-col items-center gap-4 px-6 pt-[34px]">
          <div className="h-px w-[34px] bg-[#8a8270]" />
          <span
            className="text-[17px] font-normal tracking-[0.7em] text-[#e8e4dc] [text-indent:0.7em]"
            style={serifStyle}
          >
            訃 告
          </span>
          <div className="h-px w-[34px] bg-[#8a8270]" />
        </div>

        <div className="px-[26px] pt-[30px]">
          <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden border border-[#3a362e] bg-[#1e1c17]">
            {portrait ? (
              <img
                src={toImgUrl(portrait)}
                alt={`${memorial.name} ${memorial.role}`}
                className="h-full w-full object-cover"
                style={{ filter: portraitFilter }}
              />
            ) : (
              <span className="text-[10px] tracking-[0.26em] text-[#6b6555]">
                고인 사진
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 px-[26px] pt-[30px]">
          <span className="text-xs tracking-[0.26em] text-[#a49c88]">
            {memorial.church} {memorial.role}
          </span>
          <h1
            className="text-[46px] font-light leading-tight tracking-[0.1em] text-white"
            style={serifStyle}
          >
            {memorial.name}
          </h1>
          <span className="text-[15px] tracking-[0.2em] text-[#a49c88]">
            {formatLifespan(memorial.birthDate, memorial.deathDate)}
          </span>
        </div>

        <div className="px-[30px] pt-[26px]">
          <p
            className="text-center text-sm font-light leading-[2.2] text-[#cfc9bb]"
            style={serifStyle}
          >
            {memorial.church} {memorial.name} {memorial.role}께서
            <br />
            {formatKoreanDate(memorial.deathDate)} 소천하셨기에
            <br />
            삼가 알려 드립니다.
          </p>
        </div>

        {memorial.verse?.trim() ? (
          <div className="px-[30px] pt-[26px]">
            <div className="h-px bg-[#3a362e]" />
            <p
              className="pt-[22px] text-center text-sm font-light leading-[2.1] text-[#b8b1a0]"
              style={serifStyle}
            >
              {memorial.verse.trim()}
            </p>
            <div className="pb-[22px] pt-3">
              {memorial.verseRef?.trim() ? (
                <p className="text-center text-[11px] tracking-[0.2em] text-[#7d7666]">
                  {memorial.verseRef.trim()}
                </p>
              ) : null}
            </div>
            <div className="h-px bg-[#3a362e]" />
          </div>
        ) : null}

        {memorial.summary.trim() ? (
          <div className="px-[30px] pt-[26px]">
            <p className="text-center text-[13px] leading-8 text-[#b8b1a0]">
              {memorial.summary.trim()}
            </p>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="px-[30px] pt-6">
            <div className="flex flex-col">
              {rows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex items-start gap-4 py-[15px] ${
                    index === rows.length - 1 ? "" : "border-b border-[#2a2721]"
                  }`}
                >
                  <span className="w-14 shrink-0 pt-[3px] text-[11px] tracking-[0.16em] text-[#7d7666]">
                    {row.label}
                  </span>
                  <span className="text-sm leading-relaxed text-[#e8e4dc]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {timeline.length > 0 ? (
          <div className="px-[30px] pt-[22px]">
            <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-[#7d7666]">
              Life
            </p>
            <div className="flex flex-col gap-[14px]">
              {timeline.map((item, index) => (
                <div
                  key={`${item.year}-${index}`}
                  className="flex items-baseline gap-[18px]"
                >
                  <span className="w-[38px] shrink-0 text-[15px] text-[#8a8270]">
                    {item.year}
                  </span>
                  <span className="text-[13px] leading-[1.8] text-[#b8b1a0]">
                    {item.title}
                    {item.title && item.description ? " · " : ""}
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {galleryPhotos.length > 0 ? (
          <div className="px-[30px] pt-6">
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((photo, index) => (
                <div
                  key={photo.photoUrl}
                  className="relative aspect-square overflow-hidden bg-[#232019]"
                >
                  <img
                    src={toImgUrl(photo.photoUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: portraitFilter }}
                  />
                  {index === 2 && remainingPhotoCount > 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#14130f]/70 text-xs text-[#e8e4dc]">
                      +{remainingPhotoCount}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="px-[30px] pt-[22px]">
          <div className="h-px bg-[#3a362e]" />
          <div className="grid grid-cols-2 gap-[10px] pt-5">
            {memorial.servicePlace?.trim() ? (
              <ObituaryAction
                as="a"
                href={`https://map.kakao.com/link/search/${encodeURIComponent(
                  memorial.servicePlace.trim()
                )}`}
                icon={<MapPin size={16} strokeWidth={1.6} />}
                label="길찾기"
              />
            ) : null}
            {memorial.familyPhone?.trim() ? (
              <ObituaryAction
                as="a"
                href={`tel:${memorial.familyPhone.replace(/[^0-9+]/g, "")}`}
                icon={<Phone size={16} strokeWidth={1.6} />}
                label="전화"
              />
            ) : null}
            {serviceMoment ? (
              <ObituaryAction
                as="button"
                onClick={handleSaveSchedule}
                icon={<CalendarPlus size={16} strokeWidth={1.6} />}
                label="일정 저장"
              />
            ) : null}
            <ObituaryAction
              as="button"
              onClick={handleShare}
              icon={<Share2 size={16} strokeWidth={1.6} />}
              label="부고 전하기"
            />
          </div>
          {shareMessage ? (
            <p
              aria-live="polite"
              className="pt-3 text-center text-[11px] text-[#a49c88]"
            >
              {shareMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-[10px] px-[30px] pt-[26px]">
          <Link
            href={`/memorial/${memorial.slug}`}
            className="flex h-[52px] items-center justify-center bg-[#e8e4dc] text-sm font-medium text-[#14130f]"
          >
            추모관에서 더 보기
          </Link>
          <Link
            href={`/memorial/${memorial.slug}#letters`}
            className="flex h-[52px] items-center justify-center border border-[#6b6555] text-sm font-medium text-[#e8e4dc]"
          >
            하늘로 편지 남기기
          </Link>
        </div>

        <div className="px-[30px] pt-6">
          <p className="text-center text-[11px] leading-[1.9] text-[#6b6555]">
            {ORG_INFO.name} 온라인 추모관
          </p>
        </div>
      </div>
    </div>
  );
}

type ObituaryActionProps = {
  icon: ReactNode;
  label: string;
} & (
  | { as: "a"; href: string; onClick?: never }
  | { as: "button"; onClick: () => void; href?: never }
);

function ObituaryAction(props: ObituaryActionProps) {
  const className =
    "flex h-[50px] items-center justify-center gap-2 border border-[#4a463c] text-sm text-[#e8e4dc] transition-colors hover:border-[#8a8270]";

  if (props.as === "a") {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {props.icon}
        {props.label}
      </a>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.icon}
      {props.label}
    </button>
  );
}
