/**
 * TimelineSection — 목회의 여정 타임라인
 * Design: Royal Chronicle
 * - 세로 배치 유지 (기존 좌우 교차 카드 방식)
 * - 한 번에 5개만 표시
 * - 이전/다음 버튼으로 5개씩 페이지 넘기기
 * - 넘길 때 파티클 + 골드 글로우 효과
 */
import { TIMELINE_ITEMS } from "@/data/kwonSaData";
import OrnamentDivider from "@/components/dark/OrnamentDividerDark";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ORNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-ornament-jiogLJBackAfv3ySZcEuM4.webp";
const ITEMS_PER_PAGE = 5;

function getCategoryIcon(category?: string): string {
  const map: Record<string, string> = {
    탄생: "+", 결심: "*", 신학: "†", 안수: "†",
    가정: "◆", 개척: "◇", 부흥: "▲", 기도: "†",
    선교: "◎", 성전: "◻", 청소년: "◈", 기념: "★",
    저술: "◉", 복지: "◆", 교육: "◈", 위기극복: "▲",
    은퇴: "†",
  };
  return map[category ?? ""] ?? "†";
}

// 파티클 효과
function SlideParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: i % 3 === 0 ? 6 : 4,
            height: i % 3 === 0 ? 6 : 4,
            background: i % 3 === 0 ? "#f5d77a" : i % 3 === 1 ? "#c9a84c" : "#fff8e0",
            left: `${5 + i * 6}%`,
            top: `${30 + (i % 5) * 10}%`,
            boxShadow: "0 0 8px rgba(201,168,76,0.9)",
          }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 2, 0], y: [-10, -80] }}
          transition={{ duration: 0.8, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}

// 개별 카드 (기존 좌우 교차 레이아웃 유지)
function TimelineCard({ event, index }: { event: typeof TIMELINE_ITEMS[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const isLeft = index % 2 === 0;
  const icon = getCategoryIcon(event.category);

  return (
    <div
      ref={ref}
      className={`relative flex items-start w-full mb-12 md:mb-20 ${
        isLeft ? "md:flex-row" : "md:flex-row-reverse"
      } flex-row`}
    >
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -80 : 80, y: 20 }}
        animate={isVisible ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`w-full md:w-[calc(50%-2.5rem)] ${isLeft ? "md:pr-0" : "md:pl-0"}`}
      >
        <div className="timeline-card gold-border-glow rounded-lg overflow-hidden bg-navy/80 backdrop-blur-sm hover:shadow-[0_0_40px_rgba(201,168,76,0.25)] transition-all duration-700 group">
          {/* Image */}
          <div className="relative overflow-hidden h-48 md:h-56">
            <motion.img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              initial={{ scale: 1.2 }}
              animate={isVisible ? { scale: 1 } : {}}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
            {/* Year badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <span
                className="text-gold text-xl md:text-2xl font-bold tracking-wider text-glow"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {event.year}
              </span>
            </div>
            {/* Category badge */}
            {event.category && (
              <div className="absolute top-4 right-4">
                <span className="text-xs text-gold/70 border border-gold/30 px-2 py-0.5 rounded-full bg-navy/60 backdrop-blur-sm" style={{ fontFamily: "var(--font-accent)" }}>
                  {event.category}
                </span>
              </div>
            )}
          </div>
          {/* Text */}
          <div className="p-5 md:p-6">
            <h3
              className="text-gold-light text-lg md:text-xl font-semibold mb-3 group-hover:text-glow transition-all"
              style={{ fontFamily: "var(--font-serif-kr)" }}
            >
              {event.title}
            </h3>
            <p
              className="text-ivory/60 text-sm md:text-base leading-relaxed"
              style={{ fontFamily: "var(--font-serif-kr)" }}
            >
              {event.description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Center dot (desktop only) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isVisible ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-24 w-5 h-5 rounded-full bg-gradient-to-br from-gold-light to-gold shadow-[0_0_20px_rgba(201,168,76,0.7)] z-10 items-center justify-center"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-gold-light animate-pulse" />
      </motion.div>
    </div>
  );
}

export default function TimelineSectionDark() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showParticles, setShowParticles] = useState(false);

  const totalPages = Math.ceil(TIMELINE_ITEMS.length / ITEMS_PER_PAGE);
  const currentItems = TIMELINE_ITEMS.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const triggerParticles = useCallback(() => {
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 900);
  }, []);

  const goPrev = useCallback(() => {
    if (page <= 0) return;
    setDirection(-1);
    setPage((p) => p - 1);
    triggerParticles();
    window.scrollTo({ top: document.getElementById("timeline")?.offsetTop ?? 0, behavior: "smooth" });
  }, [page, triggerParticles]);

  const goNext = useCallback(() => {
    if (page >= totalPages - 1) return;
    setDirection(1);
    setPage((p) => p + 1);
    triggerParticles();
    window.scrollTo({ top: document.getElementById("timeline")?.offsetTop ?? 0, behavior: "smooth" });
  }, [page, totalPages, triggerParticles]);

  const pageVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  };

  return (
    <section id="timeline" className="relative py-20 md:py-32">
      <SlideParticles active={showParticles} />

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />

      <div className="relative z-10 container mx-auto max-w-6xl">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-16 md:mb-24">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-gold/60 text-sm tracking-[0.3em] uppercase mb-4"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Ministry Chronicle
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            목회의 여정
          </motion.h2>
          <motion.img
            src={ORNAMENT_IMG}
            alt="ornament"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={titleVisible ? { opacity: 0.5, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-48 md:w-64 mx-auto"
          />
        </div>

        {/* Page indicator */}
        <div className="flex items-center justify-between mb-10">
          <p
            className="text-gold/50 text-sm tracking-widest"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, TIMELINE_ITEMS.length)} / {TIMELINE_ITEMS.length}
          </p>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > page ? 1 : -1);
                  setPage(i);
                  triggerParticles();
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === page
                    ? "w-6 h-2 bg-gold shadow-[0_0_10px_rgba(201,168,76,0.8)]"
                    : "w-2 h-2 bg-gold/25 hover:bg-gold/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Timeline cards — 5개씩 세로 표시 */}
        <div className="relative">
          {/* Center line (desktop) */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {currentItems.map((event, i) => (
                <TimelineCard key={`${event.year}-${event.title}`} event={event} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 이전 / 다음 버튼 */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={goPrev}
            disabled={page <= 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 text-sm
              ${page <= 0
                ? "opacity-25 cursor-not-allowed border-gold/10 text-gold/30"
                : "border-gold/40 text-gold hover:border-gold hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] hover:scale-105"
              }`}
            style={{ fontFamily: "var(--font-accent)" }}
          >
            <ChevronLeft className="w-4 h-4" />
            이전 기록
          </button>

          <span
            className="text-gold/40 text-xs tracking-widest"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            {page + 1} / {totalPages}
          </span>

          <button
            onClick={goNext}
            disabled={page >= totalPages - 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 text-sm
              ${page >= totalPages - 1
                ? "opacity-25 cursor-not-allowed border-gold/10 text-gold/30"
                : "border-gold/40 text-gold hover:border-gold hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] hover:scale-105"
              }`}
            style={{ fontFamily: "var(--font-accent)" }}
          >
            다음 기록
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <OrnamentDivider className="mt-12" />
      </div>
    </section>
  );
}
