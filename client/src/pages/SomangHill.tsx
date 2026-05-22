import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  ExternalLink,
  Film,
  MapPin,
  Play,
  TreePine,
} from "lucide-react";

const HILL_PHOTOS = [
  {
    src: "http://rc.somang.net/img/installation_pic_hill1.jpg",
    alt: "소망동산 전경",
  },
  {
    src: "http://rc.somang.net/img/installation_pic_hill2.jpg",
    alt: "소망동산 산책 공간",
  },
  {
    src: "http://rc.somang.net/img/installation_pic_hill3.jpg",
    alt: "소망동산 기념 공간",
  },
  {
    src: "http://rc.somang.net/img/installation_pic_hill4.jpg",
    alt: "소망동산 안내 사진",
  },
];

const HILL_NOTES = [
  {
    label: "기억의 자리",
    title: "소망교회 성도를 위한 공간",
    desc: "소망수양관 안에 마련된 성도의 기억 공간으로, 가족과 공동체가 고인의 신앙을 차분히 떠올릴 수 있는 장소입니다.",
  },
  {
    label: "안장과 안치",
    title: "분골을 모실 수 있는 터",
    desc: "묘비 주변에는 화장한 성도들의 분골을 안장 또는 안치할 수 있도록 정돈된 공간이 마련되어 있습니다.",
  },
  {
    label: "소망의 항구",
    title: "발걸음을 멈추게 하는 시비",
    desc: "아름다운 신앙의 유산을 남긴 성도를 기억하며 세워진 시비가 이곳을 찾는 이들에게 조용한 위로를 전합니다.",
  },
];

const CONTACTS = [
  { label: "위치", value: "경기도 광주시 곤지암읍 건업길 122-83" },
  { label: "전화", value: "031-764-6052" },
  { label: "팩스", value: "031-764-6058" },
];

const HILL_VIDEO_URL = "https://vimeo.com/99429761?fl=pl&fe=cm";
const HILL_VIDEO_POSTER =
  "https://i.vimeocdn.com/video/480604088-375050951f777a0d879374b41e36a400bb07937ec4bf63c8694b1f33f662c4f6-d_2400?region=us";

export default function SomangHill() {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#dbdad7]">
          <div className="container py-12 md:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
              <div>
                <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                  Somang Hill
                </p>
                <h1
                  className="text-5xl font-normal leading-[1.12] tracking-[-0.025em] md:text-7xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  소망동산
                </h1>
                <p className="mt-8 max-w-xl text-base leading-8 text-[#616161]">
                  소망수양관 안에 마련된 성도의 기억 공간입니다. 고인의 신앙과
                  삶을 가족과 공동체가 조용히 돌아볼 수 있도록, 필요한 안내를
                  단정하게 정리했습니다.
                </p>
              </div>

              <HillVideoCard />
            </div>

            <div className="mt-10 grid gap-px bg-[#dbdad7] sm:grid-cols-3">
              <InfoTile label="공간" value="성도의 묘" />
              <InfoTile label="기억" value="소망의 항구" />
              <InfoTile label="장소" value="소망수양관" />
            </div>

            <div className="mt-10 grid gap-px bg-[#dbdad7] md:grid-cols-[1.3fr_0.7fr]">
              <figure className="bg-[#f6f5f2]">
                <img
                  src={HILL_PHOTOS[0].src}
                  alt={HILL_PHOTOS[0].alt}
                  className="aspect-[16/10] h-full w-full object-cover"
                />
              </figure>
              <div className="grid gap-px bg-[#dbdad7] sm:grid-cols-3 md:grid-cols-1">
                {HILL_PHOTOS.slice(1).map(photo => (
                  <figure key={photo.src} className="bg-[#f6f5f2]">
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="aspect-[16/10] h-full w-full object-cover md:aspect-auto"
                    />
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dbdad7] bg-[#f6f5f2] py-16 md:py-24">
          <div className="container">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                  Place
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  조용히 머무는 자리
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#616161]">
                소망동산은 장례 이후의 기억이 흩어지지 않도록, 가족과 교회가
                함께 고인을 품위 있게 기억하는 장소입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#dbdad7] md:grid-cols-3">
              {HILL_NOTES.map(note => (
                <article key={note.label} className="bg-white p-6 md:p-8">
                  <div className="mb-12 flex items-start justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-[#616161]">
                      {note.label}
                    </span>
                    <TreePine
                      className="h-5 w-5 text-[#18181b]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3
                    className="text-xl font-normal"
                    style={{ fontFamily: "'Noto Serif KR', serif" }}
                  >
                    {note.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#616161]">
                    {note.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="grid gap-8 border border-[#dbdad7] p-6 md:grid-cols-[1fr_1fr] md:p-10">
              <div>
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                  Information
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  방문 안내
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#616161]">
                  자세한 운영 기준과 이용 절차는 소망수양관 안내를 함께
                  확인해주세요.
                </p>
              </div>

              <div>
                <div className="grid gap-px bg-[#dbdad7]">
                  {CONTACTS.map(item => (
                    <div
                      key={item.label}
                      className="grid gap-3 bg-white p-5 sm:grid-cols-[96px_1fr]"
                    >
                      <p className="text-xs text-[#616161]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#121212]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="http://rc.somang.net/installation/hill.jsp"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    원본 안내 보기
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    href="http://rc.somang.net/main/map.jsp"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 border border-[#dbdad7] bg-white px-5 text-sm font-medium text-[#121212] transition-colors hover:bg-[#f6f5f2]"
                  >
                    오시는 길
                    <MapPin className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <a
              href="/memorial/search"
              className="mt-10 inline-flex items-center gap-2 text-sm text-[#121212]"
            >
              등록된 추모관 보기
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HillVideoCard() {
  return (
    <div className="border border-[#dbdad7] bg-[#f6f5f2] p-2 md:p-3">
      <div className="overflow-hidden border border-[#dbdad7] bg-white">
        <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#dbdad7] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-[#616161]">
            <Film className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            <span className="truncate">소망동산 영상</span>
          </div>
          <a
            href={HILL_VIDEO_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs text-[#616161] underline-offset-4 hover:underline"
          >
            Vimeo
          </a>
        </div>
        <a
          href={HILL_VIDEO_URL}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-video overflow-hidden bg-[#efeeeb]"
          aria-label="소망동산 영상 Vimeo에서 보기"
        >
          <img
            src={HILL_VIDEO_POSTER}
            alt="소망동산 영상 썸네일"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/18" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-white/88 text-[#121212] shadow-sm transition-transform group-hover:scale-105">
              <Play className="ml-1 h-6 w-6 fill-current" strokeWidth={1.7} />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
            <p className="text-sm font-medium">소망동산2.1</p>
            <p className="text-xs opacity-90">Vimeo에서 보기</p>
          </div>
        </a>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <p className="text-xs text-[#616161]">{label}</p>
      <p
        className="mt-4 text-2xl font-normal"
        style={{ fontFamily: "'Noto Serif KR', serif" }}
      >
        {value}
      </p>
    </div>
  );
}
