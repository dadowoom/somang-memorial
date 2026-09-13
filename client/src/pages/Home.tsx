import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  BookOpenText,
  Flower2,
  HeartHandshake,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { Link } from "wouter";

const SERVICES = [
  {
    number: "01",
    title: "추모관 만들기",
    desc: "사랑하는 분의 삶과 신앙을 사진과 글로 차근차근 남깁니다.",
    icon: BookOpenText,
  },
  {
    number: "02",
    title: "부고 전하기",
    desc: "부고장을 만들어 가족과 이웃에게 소식을 전합니다.",
    icon: Send,
  },
  {
    number: "03",
    title: "편지 남기기",
    desc: "다 전하지 못한 말과 함께한 기억을 편지에 담습니다.",
    icon: Flower2,
  },
];

const STEPS = [
  "처음 방문하셨다면 회원가입을, 이미 가입하셨다면 로그인을 해 주세요.",
  "고인의 기본 정보와 글을 작성하고, 등록 요청 후 사진을 준비합니다.",
  "관리자 확인 후 공개된 추모관의 링크를 가족과 공동체에 공유합니다.",
];

const VALUES = [
  {
    number: "01",
    title: "가족에게는 위로",
    desc: "사진과 글에 담긴 그리운 순간을 돌아보며, 가족이 함께 기억을 나눕니다.",
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

const HERO_STILL_IMAGE = "/hero-somang-chapel-v1.jpg";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="break-keep pt-16 [overflow-wrap:anywhere]">
        <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-[#b5b0a7] bg-[#ffffff]">
          <HeroStillBackground />
          <div className="container relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-center py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="mb-6 text-[11px] font-medium tracking-[0.28em] text-[#3f3f3f] uppercase">
                소망교회 온라인 추모관
              </p>
              <h1
                className="max-w-3xl text-4xl font-normal leading-[1.12] sm:text-6xl md:text-8xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                소망이 있는 곳
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-[#333333] md:text-lg">
                <span className="block">
                  한 사람의 삶과 신앙을
                </span>
                <span className="block">
                  가족과 교회가 함께 기억합니다.
                </span>
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/memorial/search" className="w-full sm:w-auto">
                  <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#18181b] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90">
                    <Search className="h-4 w-4" />
                    추모관 찾기
                  </button>
                </Link>
                <Link href="/memorial/create" className="w-full sm:w-auto">
                  <button className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[#b5b0a7] bg-white px-6 text-sm font-medium text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                    <Plus className="h-4 w-4" />
                    추모관 만들기
                  </button>
                </Link>
                <Link
                  href="/login?redirect=/my/find-parent&mode=signup"
                  className="w-full sm:w-auto"
                >
                  <button className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[#18181b] bg-white px-6 text-sm font-medium text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white">
                    <HeartHandshake className="h-4 w-4" />
                    우리 부모님 찾기
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="memorials"
          className="scroll-mt-16 border-b border-[#b5b0a7] bg-white"
        >
          <div className="container py-12 md:py-16">
            <div className="mx-auto max-w-6xl py-10 md:py-12">
              <div className="grid gap-7 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                <div className="flex items-center gap-5 md:block">
                  <p className="text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                    함께 간직하는 기억
                  </p>
                  <div className="h-px flex-1 bg-[#616161] md:mt-8 md:w-16" />
                </div>
                <h2
                  className="max-w-3xl text-xl font-normal leading-[1.75] md:text-2xl md:leading-[1.7]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  <span className="block">
                    삶과 신앙의 이야기를 함께 간직하고
                  </span>
                  <span className="block">
                    다음 세대에 전합니다.
                  </span>
                </h2>
              </div>

              <div className="mt-10 grid border-t border-[#b5b0a7] md:grid-cols-3">
                {VALUES.map(value => (
                  <article
                    key={value.number}
                    className="border-b border-[#b5b0a7] py-6 md:border-b-0 md:border-r md:px-7 md:py-2 md:last:border-r-0 md:first:pl-0"
                  >
                    <p className="text-sm text-[#616161]">{value.number}</p>
                    <h3
                      className="mt-4 text-lg font-normal md:text-xl"
                      style={{ fontFamily: "'Noto Serif KR', serif" }}
                    >
                      {value.title}
                    </h3>
                    <p className="mt-4 text-[15px] leading-8 text-[#4a4a4a]">
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
          className="border-b border-[#b5b0a7] bg-[#f5f5f5] py-16 md:py-24"
        >
          <div className="container">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                  이용 안내
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  함께 기억하는 세 가지 방법
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#616161]">
                삶을 기록하고, 소식을 전하고, 그리운 마음을 함께 나눕니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#b5b0a7] md:grid-cols-3">
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
          className="border-b border-[#b5b0a7] bg-white py-16 md:py-24"
        >
          <div className="container grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                준비 순서
              </p>
              <h2
                className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                추모관을 준비하는 순서
              </h2>
            </div>
            <div className="border-t border-[#b5b0a7]">
              {STEPS.map((step, index) => (
                <div
                  key={step}
                  className="grid gap-6 border-b border-[#b5b0a7] py-6 md:grid-cols-[96px_1fr]"
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
            <div className="grid gap-10 border border-[#b5b0a7] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <p className="mb-4 text-[11px] font-medium tracking-[0.28em] text-[#616161] uppercase">
                  소망교회 성도 전용
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  소중한 기억을, 하나씩 남겨 주세요
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#616161]">
                  회원가입 후 추모관과 부고장을 만들 수 있습니다.
                  추모의 마음은 편지로 함께 나눌 수 있습니다.
                </p>
              </div>
              <Link href="/memorial/create">
                <button className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90">
                  추모관 만들기
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

function HeroStillBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#ffffff]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_38%,#f7f7f7_100%)]" />

      <div
        className="absolute inset-y-0 right-0 hidden w-[68vw] bg-cover bg-right-center opacity-90 md:block"
        style={{ backgroundImage: `url(${HERO_STILL_IMAGE})` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[44%] bg-cover bg-right-bottom opacity-35 md:hidden"
        style={{ backgroundImage: `url(${HERO_STILL_IMAGE})` }}
      />

      <div className="absolute inset-y-0 left-0 w-[72vw] bg-gradient-to-r from-white via-white/96 to-white/18" />
      <div className="absolute inset-y-0 right-0 hidden w-[72vw] bg-gradient-to-r from-white via-white/72 to-white/0 md:block" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(160,160,160,0.10),transparent_28%),radial-gradient(circle_at_90%_88%,rgba(150,150,150,0.09),transparent_32%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/22 via-transparent to-white/58" />
    </div>
  );
}
