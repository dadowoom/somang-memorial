/**
 * GallerySectionDark — 목회 사진 갤러리 (고급)
 * Design: Royal Chronicle
 * - 마소너리(벽돌식) 레이아웃
 * - 호버 시 줌 + 골드 글로우 효과
 * - 클릭 시 라이트박스(전체화면) 보기
 * - 스크롤 트리거 등장 애니메이션
 */
import { GALLERY_ITEMS } from "@/data/kwonSaData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

function GalleryCard({ item, index, onClick }: {
  item: typeof GALLERY_ITEMS[0];
  index: number;
  onClick: () => void;
}) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (index % 4) * 0.1 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-xl cursor-pointer group gold-border-glow"
      style={{
        gridRow: index % 5 === 0 ? "span 2" : "span 1",
      }}
    >
      <div className="relative w-full h-full min-h-[200px] md:min-h-[220px]">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          style={{ minHeight: "200px" }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

        {/* Zoom icon */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gold/10 border border-gold/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
          <ZoomIn className="w-4 h-4 text-gold" />
        </div>

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          <p
            className="text-gold-light text-sm font-semibold text-glow"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {item.title}
          </p>
          <p
            className="text-gold/50 text-xs mt-1"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            {item.year}
          </p>
        </div>

        {/* Gold glow on hover */}
        <div className="absolute inset-0 rounded-xl ring-0 group-hover:ring-1 group-hover:ring-gold/30 group-hover:shadow-[0_0_30px_rgba(201,168,76,0.15)] transition-all duration-500" />
      </div>
    </motion.div>
  );
}

function LightboxDark({ items, currentIndex, onClose, onPrev, onNext }: {
  items: typeof GALLERY_ITEMS;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  const item = items[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-deep/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/20 transition-all z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Prev button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-navy/80 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/10 transition-all disabled:opacity-20 z-10"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next button */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        disabled={currentIndex === items.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-navy/80 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/10 transition-all disabled:opacity-20 z-10"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Image */}
      <motion.div
        key={currentIndex}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl max-h-[85vh] mx-4 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: "1px solid rgba(201,168,76,0.3)",
          boxShadow: "0 0 60px rgba(201,168,76,0.15)",
        }}
      >
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-contain max-h-[75vh]"
        />
        <div className="bg-navy/90 px-6 py-4 text-center border-t border-gold/20">
          <p className="text-gold-light font-semibold text-glow" style={{ fontFamily: "var(--font-serif-kr)" }}>
            {item.title}
          </p>
          <p className="text-gold/40 text-sm mt-1" style={{ fontFamily: "var(--font-accent)" }}>
            {item.year}
          </p>
        </div>
      </motion.div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gold/30 text-sm" style={{ fontFamily: "var(--font-accent)" }}>
        {currentIndex + 1} / {items.length}
      </div>
    </motion.div>
  );
}

export default function GallerySectionDark() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i)), []);
  const nextImage = useCallback(() => setLightboxIndex(i => (i !== null && i < GALLERY_ITEMS.length - 1 ? i + 1 : i)), []);

  return (
    <>
      <section id="gallery" className="relative py-20 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy-deep to-navy" />

        {/* Star pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 container mx-auto max-w-7xl px-4">
          {/* Section title */}
          <div ref={titleRef} className="text-center mb-14 md:mb-20">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={titleVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="text-gold/60 text-sm tracking-[0.35em] uppercase mb-4"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Photo Gallery
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={titleVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              목회의 발걸음
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={titleVisible ? { scaleX: 1 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto mb-4"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={titleVisible ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-ivory/30 text-sm md:text-base"
              style={{ fontFamily: "var(--font-serif-kr)" }}
            >
              40년 목회의 소중한 순간들을 담은 사진 기록입니다
            </motion.p>
          </div>

          {/* Masonry grid */}
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
            style={{ gridAutoRows: "200px" }}
          >
            {GALLERY_ITEMS.map((item, i) => (
              <GalleryCard
                key={i}
                item={item}
                index={i}
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>

          {/* Bottom ornament */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={titleVisible ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-center mt-14"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/20" />
              <span className="text-gold/30 text-lg">✦</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/20" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <LightboxDark
            items={GALLERY_ITEMS}
            currentIndex={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prevImage}
            onNext={nextImage}
          />
        )}
      </AnimatePresence>
    </>
  );
}
