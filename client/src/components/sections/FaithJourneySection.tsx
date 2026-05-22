/**
 * FaithJourneySection — 신앙 여정 (책장 넘기기 효과)
 * Design: Royal Chronicle
 * - 클릭/스와이프로 페이지 전환되는 책 형태
 * - 3D 플립 애니메이션
 * - 각 페이지에 신앙 이정표
 */
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

const FAITH_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/faith-journey-bg-RywgpbDrsBMPYwxk6rWexc.webp";

interface FaithPage {
  chapter: string;
  title: string;
  verse: string;
  verseRef: string;
  content: string;
  year: string;
}

const pages: FaithPage[] = [
  {
    chapter: "I",
    title: "씨앗을 뿌리다",
    verse: "믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라",
    verseRef: "로마서 10:17",
    content: "1978년, 대학 입학과 함께 교회 청년부에 첫 발을 내딛다. 처음엔 친구의 권유로 시작한 교회 생활이었지만, 말씀을 통해 점차 신앙의 씨앗이 마음에 뿌려지기 시작했습니다.",
    year: "1978",
  },
  {
    chapter: "II",
    title: "물과 성령으로",
    verse: "사람이 물과 성령으로 나지 아니하면 하나님의 나라에 들어갈 수 없느니라",
    verseRef: "요한복음 3:5",
    content: "1983년, 소망교회에서 세례를 받다. 5년간의 신앙 여정 끝에 공개적으로 예수 그리스도를 구주로 고백하고, 물 위로 올라오는 순간 새로운 삶이 시작되었습니다.",
    year: "1983",
  },
  {
    chapter: "III",
    title: "섬기는 자의 기쁨",
    verse: "인자가 온 것은 섬김을 받으려 함이 아니라 도리어 섬기려 하고",
    verseRef: "마태복음 20:28",
    content: "1995년, 집사로 임명되어 본격적인 교회 봉사를 시작하다. 건축 전문 지식을 살려 교회 건축 위원회에서 헌신하며, 섬김의 참된 기쁨을 알아가기 시작했습니다.",
    year: "1995",
  },
  {
    chapter: "IV",
    title: "부르심에 응답하다",
    verse: "너희는 세상의 빛이라 산 위에 있는 동네가 숨겨지지 못할 것이요",
    verseRef: "마태복음 5:14",
    content: "2005년, 장로로 임직하다. 20년 넘게 한결같이 걸어온 신앙의 길, 교회와 성도들의 사랑과 신뢰 속에 장로의 직분을 받아 더 큰 책임과 사명을 감당하게 되었습니다.",
    year: "2005",
  },
  {
    chapter: "V",
    title: "땅 끝까지",
    verse: "땅 끝까지 이르러 내 증인이 되리라",
    verseRef: "사도행전 1:8",
    content: "2010년부터 동남아시아 선교에 참여하다. 건축 전문가로서 필리핀과 캄보디아에 교회를 세우는 사역에 동참하며, 복음이 땅 끝까지 전해지는 역사에 작은 돌 하나를 놓았습니다.",
    year: "2010",
  },
];

export default function FaithJourneySection() {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= pages.length) return;
    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage);
  }, [currentPage]);

  const variants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const page = pages[currentPage];

  return (
    <section id="faith-journey" className="relative py-20 md:py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${FAITH_BG})` }}
      />
      <div className="absolute inset-0 bg-navy-deep/80 backdrop-blur-sm" />

      <div className="relative z-10 container mx-auto max-w-5xl px-4">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-12 md:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-gold/60 text-sm tracking-[0.3em] uppercase mb-4"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Journey of Faith
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow"
            style={{ fontFamily: "var(--font-display)" }}
          >
            신앙의 여정
          </motion.h2>
        </div>

        {/* Book container */}
        <div className="relative" style={{ perspective: "1500px" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.645, 0.045, 0.355, 1] }}
              className="gold-border-glow rounded-xl bg-navy/60 backdrop-blur-md p-6 md:p-10 lg:p-14"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Chapter number */}
              <div className="text-center mb-6">
                <span
                  className="text-gold/30 text-6xl md:text-8xl font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {page.chapter}
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-center text-2xl md:text-4xl font-bold gold-gradient-text text-glow mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {page.title}
              </h3>

              {/* Year */}
              <p
                className="text-center text-gold/50 text-sm tracking-[0.2em] mb-8"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                — {page.year} —
              </p>

              {/* Divider */}
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent mx-auto mb-8" />

              {/* Verse */}
              <blockquote className="text-center mb-8 px-4 md:px-12">
                <p
                  className="text-gold-light/80 text-base md:text-lg italic leading-relaxed"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  "{page.verse}"
                </p>
                <cite
                  className="text-gold/40 text-sm mt-2 block not-italic"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  — {page.verseRef}
                </cite>
              </blockquote>

              {/* Content */}
              <p
                className="text-ivory/70 text-base md:text-lg leading-relaxed text-center max-w-2xl mx-auto"
                style={{ fontFamily: "var(--font-serif-kr)" }}
              >
                {page.content}
              </p>

              {/* Page indicator */}
              <div className="flex justify-center items-center gap-3 mt-10">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === currentPage
                        ? "bg-gold shadow-[0_0_10px_rgba(201,168,76,0.6)] scale-125"
                        : "bg-gold/20 hover:bg-gold/40"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-navy/80 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-20"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pages.length - 1}
            className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-navy/80 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-20"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
