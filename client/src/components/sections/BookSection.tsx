/**
 * BookSection — 3D 책장 넘기기 연혁 (react-pageflip)
 * Design: Warm Chronicle
 * - 진짜 종이가 접히면서 넘어가는 3D 효과
 * - 신앙의 여정 20개 항목을 책 페이지로 구성
 * - 각 페이지에 사진 + 텍스트
 * - 터치/클릭으로 페이지 넘기기
 */
import { TIMELINE_ITEMS, FAITH_CHAPTERS, PASTOR_INFO } from "@/data/pastorData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { forwardRef, useCallback, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

interface BookPage {
  type: "cover" | "chapter" | "timeline" | "faith" | "end";
  year?: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  verse?: string;
  verseRef?: string;
  chapter?: string;
  category?: string;
}

// 장로님 연혁 20개 + 신앙여정 5체터를 책 페이지로 구성
const buildBookPages = (): BookPage[] => {
  const pages: BookPage[] = [];

  // 표지
  pages.push({
    type: "cover",
    title: PASTOR_INFO.fullTitle,
    description: "신앙의 여정 · 60년의 헌신",
  });

  // 제1장 - 신앙의 여정 (연혁 1~10)
  pages.push({
    type: "chapter",
    title: "신앙의 여정",
    chapter: "제1장",
    description: "하나님의 부르심에 순종한 발자취",
  });

  TIMELINE_ITEMS.slice(0, 10).forEach((item) => {
    pages.push({
      type: "timeline",
      year: item.year,
      title: item.title,
      description: item.description,
      image: item.image,
      icon: getCategoryIcon(item.category),
      category: item.category,
    });
  });

  // 제2장 - 신앙의 열매 (연혁 11~20)
  pages.push({
    type: "chapter",
    title: "신앙의 열매",
    chapter: "제2장",
    description: "하나님이 이루신 놀라운 역사",
  });

  TIMELINE_ITEMS.slice(10).forEach((item) => {
    pages.push({
      type: "timeline",
      year: item.year,
      title: item.title,
      description: item.description,
      image: item.image,
      icon: getCategoryIcon(item.category),
      category: item.category,
    });
  });

  // 제3장 - 신앙의 여정 (5챕터)
  pages.push({
    type: "chapter",
    title: "신앙의 여정",
    chapter: "제3장",
    description: "말씀 위에 세워진 믿음의 이야기",
  });

  FAITH_CHAPTERS.forEach((ch) => {
    pages.push({
      type: "faith",
      title: ch.title,
      chapter: ch.subtitle,
      description: ch.content,
      verse: ch.verse,
      icon: ch.icon,
    });
  });

  // 마지막 페이지
  pages.push({
    type: "end",
    title: "Soli Deo Gloria",
    description: "오직 하나님께 영광\n\n이 이야기는 아직 끝나지 않았습니다.\n하나님의 은혜 안에서 계속됩니다.",
  });

  return pages;
};

function getCategoryIcon(_category?: string): string {
  return "✝";
}

const bookPages = buildBookPages();

// Each page component wrapped with forwardRef for react-pageflip
const CoverPage = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => (
  <div ref={ref} className="book-page-bg h-full flex flex-col items-center justify-center p-8 md:p-12">
    <div className="text-center">
      <div className="mb-6">
        <span className="text-gold-dark/50 text-4xl md:text-5xl">✝</span>
      </div>
      <div className="w-20 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto mb-6" />
      <p
        className="text-gold-dark/50 text-xs tracking-[0.4em] uppercase mb-4"
        style={{ fontFamily: "var(--font-accent)" }}
      >
        The Chronicle of
      </p>
      <h2
        className="text-3xl md:text-5xl font-bold gold-gradient-text mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {page.title}
      </h2>
      <div className="w-20 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto my-6" />
      <p
        className="text-warm-brown/50 text-sm md:text-base"
        style={{ fontFamily: "var(--font-serif-kr)" }}
      >
        {page.description}
      </p>
      <div className="mt-10 flex items-center justify-center gap-2 text-gold-dark/30">
        <BookOpen className="w-4 h-4" />
        <span className="text-xs tracking-wider" style={{ fontFamily: "var(--font-accent)" }}>
          넘겨서 읽어주세요
        </span>
      </div>
    </div>
  </div>
));
CoverPage.displayName = "CoverPage";

const ChapterPage = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => (
  <div ref={ref} className="book-page-bg h-full flex flex-col items-center justify-center p-8 md:p-12">
    <div className="text-center">
      <p
        className="text-gold-dark/40 text-xs tracking-[0.3em] uppercase mb-4"
        style={{ fontFamily: "var(--font-accent)" }}
      >
        {page.chapter}
      </p>
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-6" />
      <h3
        className="text-2xl md:text-4xl font-bold gold-gradient-text mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {page.title}
      </h3>
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto my-4" />
      <p
        className="text-warm-brown/50 text-sm"
        style={{ fontFamily: "var(--font-serif-kr)" }}
      >
        {page.description}
      </p>
    </div>
  </div>
));
ChapterPage.displayName = "ChapterPage";

const TimelinePage = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => (
  <div ref={ref} className="timeline-card book-page-bg h-full flex flex-col p-5 md:p-8 overflow-hidden">
    {/* Year & Icon */}
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl md:text-2xl">{page.icon}</span>
      <span
        className="text-xl md:text-2xl font-bold gold-gradient-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {page.year}
      </span>
      {page.category && (
        <span className="ml-auto text-xs text-gold-dark/40 border border-gold/20 px-2 py-0.5 rounded-full" style={{ fontFamily: "var(--font-accent)" }}>
          {page.category}
        </span>
      )}
    </div>

    {/* Image */}
    {page.image && (
      <div className="relative rounded-lg overflow-hidden mb-4 flex-shrink-0" style={{ height: "38%" }}>
        <img
          src={page.image}
          alt={page.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    )}

    {/* Title */}
    <h4
      className="text-lg md:text-xl font-bold text-warm-brown mb-2"
      style={{ fontFamily: "var(--font-serif-kr)" }}
    >
      {page.title}
    </h4>

    {/* Divider */}
    <div className="w-12 h-px bg-gradient-to-r from-gold/40 to-transparent mb-3" />

    {/* Description */}
    <p
      className="text-warm-brown/70 text-sm md:text-base leading-relaxed flex-1 overflow-hidden"
      style={{ fontFamily: "var(--font-serif-kr)" }}
    >
      {page.description}
    </p>

    {/* Page corner decoration */}
    <div className="absolute bottom-3 right-4 text-gold-dark/20 text-xs" style={{ fontFamily: "var(--font-accent)" }}>
      ❧
    </div>
  </div>
));
TimelinePage.displayName = "TimelinePage";

const FaithPage = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => (
  <div ref={ref} className="book-page-bg h-full flex flex-col p-5 md:p-8 overflow-hidden">
    {/* Icon & Chapter */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{page.icon}</span>
        <h4
          className="text-lg md:text-xl font-bold gold-gradient-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {page.title}
        </h4>
      </div>
    </div>

    {/* Chapter subtitle */}
    <p
      className="text-gold-dark/50 text-xs tracking-wider mb-3"
      style={{ fontFamily: "var(--font-accent)" }}
    >
      {page.chapter}
    </p>

    {/* Divider */}
    <div className="w-16 h-px bg-gradient-to-r from-gold/40 to-transparent mb-4" />

    {/* Description */}
    <p
      className="text-warm-brown/70 text-sm leading-relaxed flex-1"
      style={{ fontFamily: "var(--font-serif-kr)" }}
    >
      {page.description}
    </p>

    {/* Verse */}
    {page.verse && (
      <blockquote className="mt-4 border-l-2 border-gold/30 pl-3">
        <p
          className="text-gold-dark/60 text-xs italic leading-relaxed"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          "{page.verse}"
        </p>
      </blockquote>
    )}

    {/* Page corner decoration */}
    <div className="absolute bottom-3 right-4 text-gold-dark/20 text-xs" style={{ fontFamily: "var(--font-accent)" }}>
      ❧
    </div>
  </div>
));
FaithPage.displayName = "FaithPage";

const EndPage = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => (
  <div ref={ref} className="book-page-bg h-full flex flex-col items-center justify-center p-8 md:p-12">
    <div className="text-center">
      <span className="text-gold-dark/40 text-3xl md:text-4xl block mb-6">✝</span>
      <h3
        className="text-2xl md:text-3xl font-bold gold-gradient-text mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {page.title}
      </h3>
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-6" />
      {page.description?.split("\n").map((line, i) => (
        <p
          key={i}
          className="text-warm-brown/60 text-sm md:text-base leading-relaxed"
          style={{ fontFamily: "var(--font-serif-kr)" }}
        >
          {line}
        </p>
      ))}
    </div>
  </div>
));
EndPage.displayName = "EndPage";

function PageRenderer(page: BookPage, ref: React.Ref<HTMLDivElement>) {
  switch (page.type) {
    case "cover": return <CoverPage ref={ref} page={page} />;
    case "chapter": return <ChapterPage ref={ref} page={page} />;
    case "timeline": return <TimelinePage ref={ref} page={page} />;
    case "faith": return <FaithPage ref={ref} page={page} />;
    case "end": return <EndPage ref={ref} page={page} />;
  }
}

// Wrapper component that react-pageflip can use as children
const PageItem = forwardRef<HTMLDivElement, { page: BookPage }>(({ page }, ref) => {
  return PageRenderer(page, ref);
});
PageItem.displayName = "PageItem";

export default function BookSection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();
  const bookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = bookPages.length;

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const goNext = () => {
    bookRef.current?.pageFlip()?.flipNext();
  };

  const goPrev = () => {
    bookRef.current?.pageFlip()?.flipPrev();
  };

  return (
    <section id="book" className="relative py-16 md:py-24 overflow-hidden">
      {/* Warm parchment background */}
      <div className="absolute inset-0 parchment-bg" />

      <div className="relative z-10 container mx-auto max-w-6xl px-4">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <BookOpen className="w-5 h-5 text-gold-dark/50" />
            <p
              className="text-gold-dark/50 text-sm tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              The Book of Faith
            </p>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            신앙의 여정
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={titleVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-warm-brown/40 text-sm"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            페이지를 넘겨 이야기를 읽어주세요 · 총 {totalPages}페이지
          </motion.p>
        </div>

        {/* Book */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={titleVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative"
        >
          {/* Desktop Book */}
          <div className="hidden md:block">
            {/* @ts-ignore - react-pageflip types issue */}
            <HTMLFlipBook
              ref={bookRef}
              width={480}
              height={620}
              size="stretch"
              minWidth={300}
              maxWidth={600}
              minHeight={400}
              maxHeight={750}
              showCover={true}
              mobileScrollSupport={false}
              onFlip={onFlip}
              className="mx-auto"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={800}
              usePortrait={false}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.3}
              showPageCorners={true}
              disableFlipByClick={false}
              useMouseEvents={true}
              swipeDistance={30}
              clickEventForward={true}
            >
              {bookPages.map((page, i) => (
                <PageItem key={i} page={page} />
              ))}
            </HTMLFlipBook>
          </div>

          {/* Mobile Book - single page mode */}
          <div className="block md:hidden">
            {/* @ts-ignore */}
            <HTMLFlipBook
              ref={bookRef}
              width={340}
              height={500}
              size="stretch"
              minWidth={280}
              maxWidth={400}
              minHeight={420}
              maxHeight={560}
              showCover={true}
              mobileScrollSupport={false}
              onFlip={onFlip}
              className="mx-auto"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.2}
              showPageCorners={true}
              disableFlipByClick={false}
              useMouseEvents={true}
              swipeDistance={20}
              clickEventForward={true}
            >
              {bookPages.map((page, i) => (
                <PageItem key={i} page={page} />
              ))}
            </HTMLFlipBook>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={goPrev}
              disabled={currentPage === 0}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-cream-dark border border-gold/20 flex items-center justify-center text-gold-dark hover:bg-gold/10 hover:border-gold/40 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page indicator */}
            <span
              className="text-warm-brown/40 text-sm"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              {currentPage + 1} / {totalPages}
            </span>

            <button
              onClick={goNext}
              disabled={currentPage >= totalPages - 2}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-cream-dark border border-gold/20 flex items-center justify-center text-gold-dark hover:bg-gold/10 hover:border-gold/40 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
