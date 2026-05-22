import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  BookOpenText,
  Flower2,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { Link } from "wouter";

const SERVICES = [
  {
    number: "01",
    title: "소망 만들기",
    desc: "고인의 생애와 신앙의 기록을 사진, 글, 연혁으로 정리합니다.",
    icon: BookOpenText,
  },
  {
    number: "02",
    title: "소망 전하기",
    desc: "등록된 내용을 바탕으로 품위 있는 부고장과 공유 링크를 준비합니다.",
    icon: Send,
  },
  {
    number: "03",
    title: "소망 남기기",
    desc: "교회 공동체가 방문록과 헌화로 기억의 마음을 남길 수 있습니다.",
    icon: Flower2,
  },
];

const STEPS = [
  "회원가입 후 바로 시작합니다.",
  "고인 기본 정보와 사진, 생애 기록을 입력합니다.",
  "추모관을 생성하고 링크를 가족과 공동체에 공유합니다.",
];

const VALUES = [
  {
    number: "01",
    title: "가족에게는 위로",
    desc: "고인의 사진과 이야기, 추모의 글을 통해 사랑하는 이를 다시 만나고, 슬픔을 믿음 안에서 위로로 품습니다.",
  },
  {
    number: "02",
    title: "교회에는 기억",
    desc: "한 사람의 예배와 봉사, 기도와 헌신은 소망교회가 걸어온 믿음의 길 위에 남겨진 귀한 흔적입니다.",
  },
  {
    number: "03",
    title: "다음 세대에는 신앙의 유산",
    desc: "자녀와 손주들이 부모와 조부모의 삶의 고백을 만나고, 말로 다 전하지 못한 신앙의 이야기를 이어받습니다.",
  },
];

const HERO_VIDEO_ID = "3HO-vSy2Ras";
const HERO_VIDEO_START = 103;
const HERO_VIDEO_SRC = `https://www.youtube-nocookie.com/embed/${HERO_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${HERO_VIDEO_ID}&playsinline=1&rel=0&modestbranding=1&start=${HERO_VIDEO_START}`;
const HERO_VIDEO_POSTER = `https://img.youtube.com/vi/${HERO_VIDEO_ID}/maxresdefault.jpg`;

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-[#dbdad7] bg-[#f6f5f2]">
          <HeroVideoBackground />
          <div className="container relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-center py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="mb-6 text-[11px] font-medium tracking-[0.28em] text-[#3f3f3f] uppercase">
                소망교회 온라인 추모 서비스
              </p>
              <h1
                className="max-w-3xl text-5xl font-normal leading-[1.08] sm:text-6xl md:text-8xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                소망이 있는 곳
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-[#333333] md:text-lg">
                <span className="block">
                  소망교회 디지털추모관 「소망이 있는 곳」은
                </span>
                <span className="block">
                  믿음으로 살다 주님 품에 안긴 성도들의 삶과 신앙을
                  기억하는 거룩한 공간입니다.
                </span>
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/memorial/search">
                  <button className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90">
                    <Search className="h-4 w-4" />
                    추모관
                  </button>
                </Link>
                <Link href="/memorial/create">
                  <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#dbdad7] bg-white px-6 text-sm font-medium text-[#121212] transition-colors hover:bg-[#f6f5f2]">
                    <Plus className="h-4 w-4" />
                    소망 만들기
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="memorials"
          className="scroll-mt-16 border-b border-[#dbdad7] bg-white"
        >
          <div className="container py-12 md:py-16">
            <div className="mx-auto max-w-6xl border-y border-[#dbdad7] py-10 md:py-12">
              <div className="grid gap-7 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                <div className="flex items-center gap-5 md:block">
                  <p className="text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                    Values
                  </p>
                  <div className="h-px flex-1 bg-[#616161] md:mt-8 md:w-16" />
                </div>
                <h2
                  className="max-w-3xl text-xl font-normal leading-[1.75] md:text-2xl md:leading-[1.7]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  <span className="block">
                    「소망이 있는 곳」은 고인의 삶과 믿음과 사랑을
                  </span>
                  <span className="block">
                    가족과 교회의 기억 속에 아름답게 보존하며,
                  </span>
                  <span className="block">
                    다음 세대가 신앙의 이야기를 이어받도록 돕습니다.
                  </span>
                </h2>
              </div>

              <div className="mt-10 grid border-t border-[#dbdad7] md:grid-cols-3">
                {VALUES.map(value => (
                  <article
                    key={value.number}
                    className="border-b border-[#dbdad7] py-5 md:border-b-0 md:border-r md:px-7 md:last:border-r-0"
                  >
                    <p className="text-sm text-[#616161]">{value.number}</p>
                    <h3
                      className="mt-5 text-base font-normal"
                      style={{ fontFamily: "'Noto Serif KR', serif" }}
                    >
                      {value.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#616161]">
                      {value.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="border-b border-[#dbdad7] bg-[#f6f5f2] py-16 md:py-24"
        >
          <div className="container">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                  Services
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  세 가지 서비스
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#616161]">
                등록부터 공유, 공동체의 추모까지 흐름을 단순하게 정리했습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#dbdad7] md:grid-cols-3">
              {SERVICES.map(service => {
                const Icon = service.icon;
                return (
                  <article key={service.number} className="bg-white p-6 md:p-8">
                    <div className="mb-12 flex items-start justify-between">
                      <span className="text-sm text-[#616161]">
                        {service.number}
                      </span>
                      <Icon
                        className="h-5 w-5 text-[#18181b]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3
                      className="text-xl font-normal"
                      style={{ fontFamily: "'Noto Serif KR', serif" }}
                    >
                      {service.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#616161]">
                      {service.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="process"
          className="border-b border-[#dbdad7] bg-white py-16 md:py-24"
        >
          <div className="container grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                Process
              </p>
              <h2
                className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                소망 남기기
                <br />
                절차
              </h2>
            </div>
            <div className="border-t border-[#dbdad7]">
              {STEPS.map((step, index) => (
                <div
                  key={step}
                  className="grid gap-6 border-b border-[#dbdad7] py-6 md:grid-cols-[96px_1fr]"
                >
                  <span className="text-sm text-[#616161]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-base leading-8 text-[#121212]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="membership" className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="grid gap-10 border border-[#dbdad7] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                  소망교회 성도 전용
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  소망을 남길 준비가 되었나요
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#616161]">
                  회원가입 후 고인을 등록하고, 온라인 추모관과 부고장을 만들
                  수 있습니다. 방문록 작성은 누구나 참여할 수 있습니다.
                </p>
              </div>
              <Link href="/memorial/create">
                <button className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90">
                  시작하기
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HeroVideoBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#f6f5f2]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(255,255,255,0.92),transparent_34%),linear-gradient(90deg,#ffffff_0%,#faf9f6_43%,#f4f1eb_100%)]" />

      <div
        className="absolute inset-y-0 right-0 hidden w-[56vw] overflow-hidden bg-cover bg-center md:block lg:w-[62vw]"
        style={{ backgroundImage: `url(${HERO_VIDEO_POSTER})` }}
      >
        <iframe
          title="소망교회 배경 영상"
          src={HERO_VIDEO_SRC}
          className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-screen min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0 opacity-70 contrast-105 saturate-[0.85]"
          allow="autoplay; fullscreen; picture-in-picture"
          tabIndex={-1}
        />
        <div className="absolute inset-0 bg-white/28" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6f5f2] via-white/44 to-white/8" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 via-transparent to-[#f6f5f2]/58" />
      </div>

      <div className="absolute inset-y-0 left-0 w-[56vw] bg-gradient-to-r from-white via-white/92 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_10%,rgba(211,185,120,0.14),transparent_28%),radial-gradient(circle_at_92%_86%,rgba(180,190,188,0.22),transparent_34%)]" />
    </div>
  );
}
