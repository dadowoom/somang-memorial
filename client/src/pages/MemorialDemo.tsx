/**
 * MemorialDemo — 소망 만들기 데모 페이지
 * Style: Warm Chronicle (크림/아이보리 + 따뜻한 골드)
 * 1인 하드코딩 시연용 — 김요한 장로님
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";

// ─── 하드코딩 인물 데이터 ────────────────────────────────────────────────────
const PERSON = {
  name: "김요한",
  title: "장로",
  birth: "1942년 3월 15일",
  death: null, // 살아계신 분
  church: "소망교회",
  role: "원로장로 · 소망교회 창립멤버",
  intro: "60년 신앙의 여정, 가족과 교회를 위해 헌신한 삶",
  photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=1000&fit=crop&auto=format&q=80",
  verse: "내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고 믿음을 지켰으니",
  verseRef: "디모데후서 4:7",
  summary: "1942년 서울에서 태어나 소망교회 창립 멤버로 60여 년간 교회와 함께 걸어온 김요한 장로님. 세 자녀를 신앙 안에서 키우고, 교회 건축과 선교 사역에 평생을 헌신하셨습니다.",
};

const TIMELINE = [
  { year: "1942", title: "출생", desc: "서울 종로구에서 태어남" },
  { year: "1960", title: "신앙 결단", desc: "18세에 세례를 받고 신앙생활 시작" },
  { year: "1968", title: "결혼", desc: "이은혜 권사와 교회 결혼식을 올림" },
  { year: "1977", title: "소망교회 창립 참여", desc: "소망교회 창립 멤버로 함께 시작" },
  { year: "1985", title: "집사 임직", desc: "교회 재정 집사로 섬기기 시작" },
  { year: "1995", title: "장로 임직", desc: "소망교회 장로로 임직, 30년 섬김의 시작" },
  { year: "2010", title: "선교 후원", desc: "아프리카 케냐 선교사 파송 후원 시작" },
  { year: "2020", title: "원로장로 추대", desc: "평생 헌신에 감사하며 원로장로로 추대" },
];

const GALLERY = [
  {
    url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop&auto=format&q=80",
    caption: "가족과 함께 (2018)",
  },
  {
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format&q=80",
    caption: "교회 창립 40주년 기념 (2017)",
  },
  {
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80",
    caption: "결혼 50주년 (2018)",
  },
  {
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format&q=80",
    caption: "장로 임직 25주년 (2020)",
  },
];

const MESSAGES = [
  { name: "이은혜 권사", relation: "배우자", msg: "평생 믿음으로 가정을 이끌어 주셔서 감사합니다. 당신의 기도가 우리 가족의 힘이었습니다." },
  { name: "김성민 목사", relation: "장남", msg: "아버지의 신앙을 이어받아 목사가 된 것이 제 삶의 가장 큰 축복입니다." },
  { name: "박담임 목사", relation: "소망교회 담임목사", msg: "장로님의 헌신과 기도가 소망교회를 지금의 모습으로 세웠습니다. 진심으로 감사드립니다." },
  { name: "최집사", relation: "교회 성도", msg: "장로님께서 항상 먼저 손을 내밀어 주셨습니다. 그 따뜻함을 잊지 못합니다." },
];

// ─── 골드 파티클 컴포넌트 ────────────────────────────────────────────────────
function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: "oklch(0.70 0.09 65)",
            opacity: Math.random() * 0.4 + 0.1,
            animation: `float ${Math.random() * 8 + 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── 섹션 페이드인 훅 ─────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

// ─── 섹션 헤더 공통 컴포넌트 ─────────────────────────────────────────────────
function SectionHeader({ en, ko, sub }: { en: string; ko: string; sub?: string }) {
  return (
    <div className="text-center mb-14">
      <p className="text-xs tracking-widest mb-3" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.3em" }}>{en}</p>
      <h2 className="text-3xl md:text-4xl font-light mb-3" style={{ fontFamily: "'Noto Serif KR', serif", color: "oklch(0.25 0.04 50)", letterSpacing: "-0.02em" }}>{ko}</h2>
      {sub && <p className="text-sm" style={{ color: "oklch(0.5 0.04 55)", fontWeight: 300 }}>{sub}</p>}
      <div className="flex items-center justify-center gap-3 mt-5">
        <div className="w-10 h-px" style={{ background: "oklch(0.65 0.12 70)", opacity: 0.5 }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.65 0.12 70)" }} />
        <div className="w-10 h-px" style={{ background: "oklch(0.65 0.12 70)", opacity: 0.5 }} />
      </div>
    </div>
  );
}

export default function MemorialDemo() {
  const heroFade = useFadeIn();
  const timelineFade = useFadeIn();
  const galleryFade = useFadeIn();
  const faithFade = useFadeIn();
  const msgFade = useFadeIn();

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.01 85)" }}>
      <Navbar />

      {/* ══════════════════════════════════════════════════════════════
          HERO — 따뜻한 크림 배경 + 인물 사진
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden pt-16"
        style={{ background: "linear-gradient(135deg, #faf6ef 0%, #f5ede0 50%, #efe5d5 100%)" }}
      >
        <GoldParticles />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center py-16 md:py-24">

            {/* 텍스트 */}
            <div
              ref={heroFade.ref}
              style={{
                opacity: heroFade.visible ? 1 : 0,
                transform: heroFade.visible ? "translateY(0)" : "translateY(30px)",
                transition: "all 1s ease",
              }}
            >
              {/* 태그 */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-px" style={{ background: "oklch(0.65 0.12 70)" }} />
                <p className="text-xs tracking-widest" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.3em" }}>
                  소망 만들기 · 개인 기념관
                </p>
              </div>

              {/* 이름 */}
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-light mb-4"
                style={{
                  fontFamily: "'Noto Serif KR', serif",
                  color: "oklch(0.25 0.04 50)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                {PERSON.name}
              </h1>
              <p
                className="text-xl mb-2"
                style={{ color: "oklch(0.65 0.12 70)", fontFamily: "'Noto Serif KR', serif", fontWeight: 300 }}
              >
                {PERSON.title}
              </p>
              <p className="text-sm mb-8" style={{ color: "oklch(0.5 0.04 55)", fontWeight: 300 }}>
                {PERSON.role}
              </p>

              {/* 골드 구분선 */}
              <div className="w-16 h-px mb-8" style={{ background: "oklch(0.65 0.12 70)" }} />

              {/* 소개 */}
              <p
                className="text-base md:text-lg leading-relaxed mb-10"
                style={{
                  color: "oklch(0.35 0.04 50)",
                  fontFamily: "'Noto Serif KR', serif",
                  fontWeight: 300,
                  lineHeight: 1.9,
                }}
              >
                {PERSON.summary}
              </p>

              {/* 생년 */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs tracking-widest mb-1" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.2em" }}>출생</p>
                  <p className="text-sm font-medium" style={{ color: "oklch(0.25 0.04 50)", fontFamily: "'Noto Serif KR', serif" }}>{PERSON.birth}</p>
                </div>
                <div className="w-8 h-px" style={{ background: "oklch(0.65 0.12 70)", opacity: 0.4 }} />
                <div className="text-center">
                  <p className="text-xs tracking-widest mb-1" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.2em" }}>교회</p>
                  <p className="text-sm font-medium" style={{ color: "oklch(0.25 0.04 50)", fontFamily: "'Noto Serif KR', serif" }}>{PERSON.church}</p>
                </div>
              </div>
            </div>

            {/* 사진 */}
            <div className="relative flex justify-center md:justify-end">
              {/* 배경 장식 */}
              <div
                className="absolute -top-4 -right-4 w-full h-full"
                style={{ border: "1px solid oklch(0.65 0.12 70)", opacity: 0.3 }}
              />
              <div
                className="absolute -bottom-4 -left-4 w-full h-full"
                style={{ border: "1px solid oklch(0.65 0.12 70)", opacity: 0.15 }}
              />
              <div className="relative overflow-hidden" style={{ maxWidth: "380px", width: "100%" }}>
                <img
                  src={PERSON.photo}
                  alt={PERSON.name}
                  className="w-full"
                  style={{ aspectRatio: "4/5", objectFit: "cover", filter: memorialPhotoFilter }}
                />
                {/* 하단 골드 바 */}
                <div
                  className="absolute bottom-0 left-0 right-0 py-4 px-5"
                  style={{ background: "linear-gradient(to top, rgba(180,130,60,0.85) 0%, transparent 100%)" }}
                >
                  <p className="text-white text-xs italic text-center" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                    "{PERSON.verse.substring(0, 30)}..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 웨이브 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="oklch(0.97 0.01 85)" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TIMELINE — 생애 연혁
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36" style={{ background: "oklch(0.97 0.01 85)" }}>
        <div className="container">
          <SectionHeader en="Life Journey" ko="생애의 여정" sub="하나님과 함께 걸어온 발자취" />

          <div
            ref={timelineFade.ref}
            className="relative max-w-3xl mx-auto"
            style={{
              opacity: timelineFade.visible ? 1 : 0,
              transform: timelineFade.visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.9s ease",
            }}
          >
            {/* 중앙 세로선 */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block"
              style={{ background: "linear-gradient(to bottom, transparent, oklch(0.65 0.12 70) 10%, oklch(0.65 0.12 70) 90%, transparent)", opacity: 0.3 }}
            />

            <div className="space-y-8 md:space-y-0">
              {TIMELINE.map((item, i) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  style={{ marginBottom: "2.5rem" }}
                >
                  {/* 카드 */}
                  <div
                    className={`w-full md:w-5/12 p-5 ${i % 2 === 0 ? "md:pr-10 md:text-right" : "md:pl-10 md:text-left"}`}
                    style={{
                      background: "white",
                      border: "1px solid oklch(0.88 0.02 75)",
                      boxShadow: "0 2px 20px rgba(180,130,60,0.06)",
                    }}
                  >
                    <p className="text-xs font-semibold mb-2 tracking-widest" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.2em" }}>{item.year}</p>
                    <h3 className="text-base font-medium mb-1" style={{ fontFamily: "'Noto Serif KR', serif", color: "oklch(0.25 0.04 50)" }}>{item.title}</h3>
                    <p className="text-sm" style={{ color: "oklch(0.5 0.04 55)", fontWeight: 300 }}>{item.desc}</p>
                  </div>

                  {/* 중앙 도트 */}
                  <div className="hidden md:flex w-2/12 justify-center">
                    <div
                      className="w-4 h-4 rounded-full border-2 z-10"
                      style={{ background: "oklch(0.97 0.01 85)", borderColor: "oklch(0.65 0.12 70)" }}
                    />
                  </div>

                  {/* 빈 공간 */}
                  <div className="hidden md:block w-5/12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          GALLERY — 사진 갤러리
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 md:py-36"
        style={{ background: "linear-gradient(135deg, #faf6ef 0%, #f5ede0 100%)" }}
      >
        <div className="container">
          <SectionHeader en="Gallery" ko="사진 갤러리" sub="소중한 순간들" />

          <div
            ref={galleryFade.ref}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
            style={{
              opacity: galleryFade.visible ? 1 : 0,
              transform: galleryFade.visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.9s ease",
            }}
          >
            {GALLERY.map((photo, i) => (
              <div key={i} className="group relative overflow-hidden cursor-pointer">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full transition-transform duration-500 group-hover:scale-105"
                  style={{ aspectRatio: "4/3", objectFit: "cover", filter: memorialPhotoFilter }}
                />
                <div
                  className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(to top, rgba(180,130,60,0.7) 0%, transparent 100%)" }}
                >
                  <p className="text-white text-xs" style={{ fontFamily: "'Noto Serif KR', serif" }}>{photo.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FAITH — 신앙 이야기 + 성경 구절
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36" style={{ background: "oklch(0.97 0.01 85)" }}>
        <div className="container">
          <SectionHeader en="Faith Story" ko="신앙의 이야기" />

          <div
            ref={faithFade.ref}
            className="max-w-4xl mx-auto"
            style={{
              opacity: faithFade.visible ? 1 : 0,
              transform: faithFade.visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.9s ease",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              {/* 성경 구절 카드 */}
              <div
                className="relative p-10 md:p-12"
                style={{
                  background: "linear-gradient(135deg, oklch(0.22 0.06 255) 0%, oklch(0.15 0.04 255) 100%)",
                }}
              >
                <GoldParticles />
                <div className="relative z-10 text-center">
                  <div
                    className="text-5xl font-light mb-4 select-none"
                    style={{ color: "oklch(0.65 0.12 70)", fontFamily: "Georgia, serif", lineHeight: 1, opacity: 0.6 }}
                  >
                    "
                  </div>
                  <p
                    className="text-lg leading-relaxed mb-6 text-white"
                    style={{ fontFamily: "'Noto Serif KR', serif", fontWeight: 300 }}
                  >
                    {PERSON.verse}
                  </p>
                  <p className="text-xs tracking-widest" style={{ color: "oklch(0.65 0.12 70)", letterSpacing: "0.2em" }}>
                    {PERSON.verseRef}
                  </p>
                </div>
              </div>

              {/* 신앙 이야기 텍스트 */}
              <div>
                <div className="w-10 h-px mb-6" style={{ background: "oklch(0.65 0.12 70)" }} />
                <h3
                  className="text-xl font-medium mb-5"
                  style={{ fontFamily: "'Noto Serif KR', serif", color: "oklch(0.25 0.04 50)" }}
                >
                  60년 신앙의 여정
                </h3>
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: "oklch(0.4 0.04 50)", fontWeight: 300, lineHeight: 1.9 }}>
                  <p>18세에 세례를 받은 이후, 김요한 장로님은 단 한 번도 신앙의 길에서 벗어나지 않으셨습니다. 어려운 시절에도 주일 예배를 빠지지 않으셨고, 새벽 기도를 30년 넘게 이어오셨습니다.</p>
                  <p>소망교회 창립 멤버로서 교회 건축 헌금을 위해 개인 재산을 아낌없이 내놓으셨고, 케냐 선교사 파송을 위해 매달 후원을 이어오고 계십니다.</p>
                  <p>"믿음은 행동으로 증명된다"는 것이 장로님의 삶의 철학입니다. 말씀보다 삶으로 먼저 보여주신 분입니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MESSAGES — 감사 메시지 / 방문록
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 md:py-36"
        style={{ background: "linear-gradient(135deg, #faf6ef 0%, #f5ede0 100%)" }}
      >
        <div className="container">
          <SectionHeader en="Messages" ko="감사의 마음" sub="함께한 분들의 이야기" />

          <div
            ref={msgFade.ref}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto"
            style={{
              opacity: msgFade.visible ? 1 : 0,
              transform: msgFade.visible ? "translateY(0)" : "translateY(30px)",
              transition: "all 0.9s ease",
            }}
          >
            {MESSAGES.map((msg, i) => (
              <div
                key={i}
                className="p-7"
                style={{
                  background: "white",
                  border: "1px solid oklch(0.88 0.02 75)",
                  boxShadow: "0 2px 20px rgba(180,130,60,0.05)",
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* 아바타 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-medium"
                    style={{ background: "oklch(0.65 0.12 70)" }}
                  >
                    {msg.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "oklch(0.25 0.04 50)", fontFamily: "'Noto Serif KR', serif" }}>{msg.name}</p>
                    <p className="text-xs" style={{ color: "oklch(0.65 0.12 70)" }}>{msg.relation}</p>
                  </div>
                </div>
                {/* 구분선 */}
                <div className="w-6 h-px mb-4" style={{ background: "oklch(0.65 0.12 70)", opacity: 0.4 }} />
                <p className="text-sm leading-relaxed italic" style={{ color: "oklch(0.4 0.04 50)", fontFamily: "'Noto Serif KR', serif", fontWeight: 300 }}>
                  "{msg.msg}"
                </p>
              </div>
            ))}
          </div>

          {/* 메시지 남기기 버튼 */}
          <div className="text-center mt-12">
            <button
              className="px-10 py-4 text-sm font-medium tracking-widest transition-all hover:opacity-90"
              style={{
                background: "oklch(0.65 0.12 70)",
                color: "white",
                letterSpacing: "0.12em",
              }}
              onClick={() => alert("메시지 남기기 기능은 추후 구현됩니다.")}
            >
              감사 메시지 남기기
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BACK TO HOME
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-16 text-center"
        style={{ background: "oklch(0.97 0.01 85)", borderTop: "1px solid oklch(0.88 0.02 75)" }}
      >
        <Link href="/">
          <button
            className="text-sm tracking-widest transition-all hover:opacity-70"
            style={{
              color: "oklch(0.25 0.04 50)",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid oklch(0.25 0.04 50)",
              paddingBottom: "2px",
              letterSpacing: "0.1em",
            }}
          >
            홈으로 돌아가기
          </button>
        </Link>
      </section>

      <Footer />

      {/* 파티클 애니메이션 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
          33% { transform: translateY(-20px) rotate(120deg); opacity: 0.35; }
          66% { transform: translateY(-10px) rotate(240deg); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
