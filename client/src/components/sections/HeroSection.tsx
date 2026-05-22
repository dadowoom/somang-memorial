/**
 * HeroSection — 인트로 히어로 섹션
 * Design: Warm Chronicle — 밝고 따뜻한 크림 톤
 * - Ken Burns: 배경이 천천히 줌인 + 미세 패닝
 * - 렌즈 플레어: 좌상단에서 따뜻한 빛 번짐
 * - 타이핑 애니메이션으로 이름과 직함 등장
 */
import { useTypewriter } from "@/hooks/useTypewriter";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/warm-hero-bg-FPfCiJeeigSXDYkdaN53Mx.webp";

interface HeroSectionProps {
  name: string;
  church: string;
  title?: string;
  heroQuote?: string;
  heroQuoteRef?: string;
}

export default function HeroSection({ name, church, title = "장로", heroQuote, heroQuoteRef }: HeroSectionProps) {
  const typedName = name.split("").join(" ");
  const typedTitle = `${church} ${title}`;

  const { displayed: displayedName, isDone: nameDone } = useTypewriter(typedName, 150, 800);
  const { displayed: displayedTitle } = useTypewriter(typedTitle, 100, 2200);

  const quote = heroQuote || "내가 달려갈 길과 주 예수께 받은 사명 곧 하나님의 은혜의 복음을 증언하는 일을 마치려 함에는 나의 생명조차 조금도 귀한 것으로 여기지 아니하노라";
  const quoteRef = heroQuoteRef || "사도행전 20:24";

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Ken Burns 배경 — 천천히 줌인 + 미세 패닝 */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          transformOrigin: "55% 50%",
        }}
        initial={{ scale: 1.08, x: -8 }}
        animate={{ scale: 1.0, x: 0 }}
        transition={{ duration: 12, ease: "easeOut" }}
      />

      {/* 크림 오버레이 */}
      <div className="absolute inset-0 bg-cream/25" />

      {/* 하단 그라데이션 페이드 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, oklch(0.97 0.015 80))",
        }}
      />

      {/* 렌즈 플레어 — 좌상단 (따뜻한 햇살 느낌) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-8%",
          left: "-5%",
          width: "55vmin",
          height: "55vmin",
          background:
            "radial-gradient(ellipse at center, rgba(255,220,120,0.18) 0%, rgba(220,180,80,0.08) 35%, transparent 65%)",
          borderRadius: "50%",
          filter: "blur(25px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.6, 0.8, 0.6] }}
        transition={{ duration: 8, delay: 1, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* 렌즈 플레어 — 작은 빛 점 */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "6%",
          left: "10%",
          width: "8px",
          height: "8px",
          background: "rgba(255,230,130,0.95)",
          borderRadius: "50%",
          boxShadow:
            "0 0 20px 8px rgba(220,180,80,0.4), 0 0 60px 20px rgba(220,180,80,0.15)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 0.9, 0.7] }}
        transition={{ duration: 6, delay: 1.5, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* 렌즈 플레어 — 수평 빛 줄기 */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "calc(6% + 4px)",
          right: "0",
          left: "0",
          height: "1px",
          background:
            "linear-gradient(90deg, rgba(255,220,120,0.2) 0%, rgba(255,220,120,0.08) 20%, transparent 50%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.4] }}
        transition={{ duration: 4, delay: 2, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Cross icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6"
        >
          <span className="text-gold-dark/60 text-3xl md:text-4xl">✝</span>
        </motion.div>

        {/* Small subtitle above name */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-gold-dark/60 text-sm md:text-base tracking-[0.4em] uppercase mb-6"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          A Chronicle of Ministry
        </motion.p>

        {/* Gold ornament line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="w-32 md:w-48 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-8"
        />

        {/* Name with typewriter */}
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[0.15em] gold-gradient-text text-glow-strong mb-4"
          style={{ fontFamily: "var(--font-display)", minHeight: "1.2em" }}
        >
          {displayedName}
          {!nameDone && (
            <span className="inline-block w-[3px] h-[0.8em] bg-gold ml-1 animate-pulse" />
          )}
        </h1>

        {/* Title with typewriter */}
        <div className="h-10 md:h-12 flex items-center justify-center">
          <p
            className="text-xl md:text-2xl lg:text-3xl text-warm-brown/80 tracking-[0.2em]"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {displayedTitle}
            {nameDone && displayedTitle.length < typedTitle.length && (
              <span className="inline-block w-[2px] h-[0.8em] bg-gold ml-1 animate-pulse" />
            )}
          </p>
        </div>

        {/* Gold ornament line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 2.8 }}
          className="w-32 md:w-48 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mt-8 mb-10"
        />

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 3.2 }}
          className="text-warm-brown/50 text-sm md:text-base max-w-lg mx-auto italic"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          "{quote}"
          <br />
          <span className="text-xs text-gold-dark/40 mt-1 inline-block">— {quoteRef}</span>
        </motion.p>
      </div>

      {/* Scroll down indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
      >
        <span
          className="text-gold-dark/40 text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-gold-dark/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
