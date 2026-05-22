/**
 * HeroSection — 인트로 히어로 섹션
 * Design: Royal Chronicle
 * - Ken Burns 효과: 배경이 천천히 줌인되며 패닝
 * - 렌즈 플레어: 우상단에서 은은한 빛 번짐
 * - 타이핑 애니메이션으로 이름과 직함 등장
 * - 글로우 텍스트 효과
 */
import { useTypewriter } from "@/hooks/useTypewriter";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/hero-bg-XtG8YdksVk27uZdBDb5XRJ.webp";

interface HeroSectionDarkProps {
  name: string;       // 예: "김요한"
  church: string;     // 예: "소망교회 권사"
  title?: string;     // 직함 (없으면 church를 그대로 사용)
  heroQuote?: string; // 히어로 인용구 (없으면 기본값 사용)
  heroQuoteRef?: string;
}

export default function HeroSectionDark({ name, church, title, heroQuote, heroQuoteRef }: HeroSectionDarkProps) {
  // 이름을 한 글자씩 띄어서 타이핑 효과 (예: "김 요 한")
  const typedName = name.split("").join(" ");
  const typedTitle = title || church;

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
          transformOrigin: "center center",
        }}
        initial={{ scale: 1.08, x: 10 }}
        animate={{ scale: 1.0, x: 0 }}
        transition={{ duration: 12, ease: "easeOut" }}
      />

      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-navy-deep/50" />

      {/* 하단 그라데이션 페이드 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, oklch(0.1 0.03 260))",
        }}
      />

      {/* 렌즈 플레어 — 우상단 */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "-5%",
          right: "-5%",
          width: "50vmin",
          height: "50vmin",
          background:
            "radial-gradient(ellipse at center, rgba(255,240,180,0.12) 0%, rgba(201,168,76,0.06) 30%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(20px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.5, 0.7, 0.5] }}
        transition={{ duration: 8, delay: 1, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* 렌즈 플레어 — 작은 빛 점 */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "8%",
          right: "12%",
          width: "6px",
          height: "6px",
          background: "rgba(255,240,180,0.9)",
          borderRadius: "50%",
          boxShadow: "0 0 20px 8px rgba(201,168,76,0.4), 0 0 60px 20px rgba(201,168,76,0.15)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 0.9, 0.6] }}
        transition={{ duration: 6, delay: 1.5, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* 렌즈 플레어 — 수평 빛 줄기 */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "calc(8% + 3px)",
          right: "0",
          left: "0",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, transparent 60%, rgba(255,240,180,0.15) 80%, rgba(255,240,180,0.05) 90%, transparent 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.4] }}
        transition={{ duration: 4, delay: 2, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Small subtitle above name */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-gold/70 text-sm md:text-base tracking-[0.4em] uppercase mb-6"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          신 앙 기 념 관
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
            className="text-xl md:text-2xl lg:text-3xl text-gold-light/90 tracking-[0.2em]"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {displayedTitle}
            {nameDone && displayedTitle.length < typedTitle.length && (
              <span className="inline-block w-[2px] h-[0.8em] bg-gold-light ml-1 animate-pulse" />
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
          className="text-ivory/60 text-sm md:text-base max-w-lg mx-auto italic"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          "{quote.slice(0, 40)}..."
          <br />
          <span className="text-xs text-gold/40 mt-1 inline-block">— {quoteRef}</span>
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
          className="text-gold/50 text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-gold/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
