/**
 * FaithJourneySection — 목회 여정 (책장 넘기기 효과)
 * Design: Royal Chronicle
 * - 클릭/스와이프로 페이지 전환되는 책 형태
 * - 3D 플립 애니메이션
 * - 각 페이지에 목회 이정표
 * - 목사님 FAITH_CHAPTERS 데이터 사용
 */
import { FAITH_CHAPTERS } from "@/data/kwonSaData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

const FAITH_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/faith-journey-bg-RywgpbDrsBMPYwxk6rWexc.webp";

export default function FaithJourneySectionDark() {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= FAITH_CHAPTERS.length) return;
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

  const page = FAITH_CHAPTERS[currentPage];

  // Parse verse and verseRef from combined string "content — ref"
  const verseText = page.verse.includes("—") ? page.verse.split("—")[0].trim() : page.verse;
  const verseRef = page.verse.includes("—") ? page.verse.split("—")[1].trim() : "";

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
              <div className="text-center mb-4">
                <span
                  className="text-gold/30 text-5xl md:text-7xl font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {page.chapter}
                </span>
              </div>

              {/* Icon */}
              <div className="text-center mb-4">
                <span className="text-gold/60 text-2xl font-light" style={{ fontFamily: "var(--font-accent)" }}>†</span>
              </div>

              {/* Title */}
              <h3
                className="text-center text-2xl md:text-4xl font-bold gold-gradient-text text-glow mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {page.title}
              </h3>

              {/* Subtitle */}
              <p
                className="text-center text-gold/50 text-sm md:text-base tracking-[0.15em] mb-6"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                {page.subtitle}
              </p>

              {/* Divider */}
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent mx-auto mb-8" />

              {/* Verse */}
              <blockquote className="text-center mb-8 px-4 md:px-12">
                <p
                  className="text-gold-light/80 text-base md:text-lg italic leading-relaxed"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  "{verseText}"
                </p>
                {verseRef && (
                  <cite
                    className="text-gold/40 text-sm mt-2 block not-italic"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    — {verseRef}
                  </cite>
                )}
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
                {FAITH_CHAPTERS.map((_, i) => (
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
            disabled={currentPage === FAITH_CHAPTERS.length - 1}
            className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-navy/80 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 hover:border-gold/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed z-20"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
