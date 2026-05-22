/**
 * CinematicIntroWarm — 시네마틱 인트로 (Warm Chronicle 스타일)
 * - 밝은 크림/아이보리 배경에서 시작
 * - 따뜻한 골드 빛이 중앙에서 퍼져나옴
 * - 책이 펼쳐지는 느낌의 십자가 등장
 * - 이름이 따뜻한 금빛으로 새겨짐
 * - 5초 자동 종료, 1.5초 후 스킵 버튼
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface CinematicIntroWarmProps {
  onComplete: () => void;
  pastorName?: string;
}

function WarmLightRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 origin-left"
      style={{
        width: "60vmax",
        height: "2px",
        rotate: `${angle}deg`,
        translateX: "0%",
        translateY: "-50%",
        background:
          "linear-gradient(90deg, rgba(180,140,50,0.0) 0%, rgba(180,140,50,0.12) 30%, rgba(220,190,100,0.06) 70%, transparent 100%)",
      }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 2.5, delay, ease: "easeOut" }}
    />
  );
}

function WarmParticle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: "radial-gradient(circle, rgba(220,190,100,0.9) 0%, rgba(180,140,50,0.3) 60%, transparent 100%)",
        boxShadow: `0 0 ${size * 3}px rgba(180,140,50,0.5)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0.5, 0],
        scale: [0, 1, 1.2, 0],
        y: [0, -20, -40],
      }}
      transition={{ duration: 3, delay, ease: "easeOut" }}
    />
  );
}

const PARTICLES = [
  { x: 48, y: 52, delay: 0.8, size: 3 },
  { x: 52, y: 48, delay: 1.0, size: 2 },
  { x: 45, y: 55, delay: 1.2, size: 4 },
  { x: 55, y: 45, delay: 0.9, size: 2 },
  { x: 50, y: 60, delay: 1.4, size: 3 },
  { x: 42, y: 50, delay: 1.1, size: 2 },
  { x: 58, y: 50, delay: 1.3, size: 3 },
  { x: 50, y: 40, delay: 0.7, size: 2 },
  { x: 46, y: 44, delay: 1.5, size: 2 },
  { x: 54, y: 56, delay: 1.6, size: 3 },
];

const LIGHT_RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => ({
  angle,
  delay: 0.5 + i * 0.06,
}));

export default function CinematicIntroWarm({ onComplete, pastorName }: CinematicIntroWarmProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 1500);
    const autoTimer = setTimeout(() => handleComplete(), 5000);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
    };
  }, []);

  function handleComplete() {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 900);
  }

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="cinematic-intro-warm"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{ background: "oklch(0.96 0.02 80)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          {/* 중앙 따뜻한 빛 글로우 */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "50vmin",
              height: "50vmin",
              background:
                "radial-gradient(circle, rgba(220,190,100,0.25) 0%, rgba(180,140,50,0.08) 50%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.8, 1.3], opacity: [0, 0.9, 0.6] }}
            transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
          />

          {/* 방사형 빛줄기 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {LIGHT_RAYS.map(({ angle, delay }) => (
              <WarmLightRay key={angle} angle={angle} delay={delay} />
            ))}
          </div>

          {/* 파티클 */}
          <div className="absolute inset-0 pointer-events-none">
            {PARTICLES.map((p, i) => (
              <WarmParticle key={i} {...p} />
            ))}
          </div>

          {/* 배경 페이퍼 텍스처 느낌 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,190,100,0.15) 0%, transparent 60%)",
            }}
          />

          {/* 메인 콘텐츠 */}
          <div className="relative z-10 text-center select-none">
            {/* 십자가 — 따뜻하게 등장 */}
            <motion.div
              initial={{ scale: 1.5, opacity: 0, filter: "blur(15px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
              className="mb-8"
            >
              <motion.svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                className="mx-auto block w-24 md:w-32"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(180,140,50,0.6)) drop-shadow(0 0 40px rgba(180,140,50,0.3))",
                }}
                animate={{
                  filter: [
                    "drop-shadow(0 0 20px rgba(180,140,50,0.6)) drop-shadow(0 0 40px rgba(180,140,50,0.3))",
                    "drop-shadow(0 0 35px rgba(220,190,100,0.9)) drop-shadow(0 0 70px rgba(180,140,50,0.5))",
                    "drop-shadow(0 0 15px rgba(180,140,50,0.5)) drop-shadow(0 0 30px rgba(180,140,50,0.2))",
                  ],
                }}
                transition={{ duration: 3, delay: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <defs>
                  <linearGradient id="goldGradWarm" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fce4a3" stopOpacity="1" />
                    <stop offset="50%" stopColor="#d4a843" stopOpacity="1" />
                    <stop offset="100%" stopColor="#a07828" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path d="M 54 8 Q 60 8 60 14 L 60 106 Q 60 112 54 112 Q 48 112 48 106 L 48 14 Q 48 8 54 8" fill="url(#goldGradWarm)" />
                <path d="M 8 54 Q 8 60 14 60 L 106 60 Q 112 60 112 54 Q 112 48 106 48 L 14 48 Q 8 48 8 54" fill="url(#goldGradWarm)" />
                <path d="M 51 10 Q 54 10 54 13 L 54 107 Q 54 110 51 110" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                <path d="M 10 51 Q 10 54 13 54 L 107 54 Q 110 54 110 51" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
              </motion.svg>
            </motion.div>

            {/* 기념관 */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{ duration: 1.5, delay: 0.8 }}
              className="text-xs md:text-sm uppercase mb-4"
              style={{
                fontFamily: "var(--font-accent)",
                color: "rgba(160,120,40,0.45)",
              }}
            >
              소 망 기 념 관
            </motion.p>

            {/* 이름 — 따뜻한 금빛 각인 */}
            <div className="relative overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  background:
                    "linear-gradient(135deg, #a07828 0%, #d4a843 35%, #f0d070 55%, #c09030 75%, #8a6420 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 2px 8px rgba(180,140,50,0.3))",
                  letterSpacing: "0.15em",
                }}
              >
                {pastorName || "김영수 장로님"}
              </motion.h1>
              {/* 빛 스윕 */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                  skewX: "-15deg",
                }}
                initial={{ x: "-150%" }}
                animate={{ x: "250%" }}
                transition={{ duration: 1.0, delay: 2.0, ease: "easeInOut" }}
              />
            </div>

            {/* 구분선 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 1.8 }}
              className="mx-auto mt-6 mb-4"
              style={{
                width: "160px",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(180,140,50,0.5), transparent)",
              }}
            />

            {/* Soli Deo Gloria */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 2.2 }}
              style={{
                fontFamily: "var(--font-accent)",
                color: "rgba(160,120,40,0.35)",
                letterSpacing: "0.3em",
                fontSize: "0.7rem",
              }}
            >
              Soli Deo Gloria
            </motion.p>
          </div>

          {/* 스킵 버튼 */}
          <AnimatePresence>
            {showSkip && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                onClick={handleComplete}
                className="absolute bottom-8 right-8 flex items-center gap-2 cursor-pointer group"
                style={{ background: "none", border: "none" }}
              >
                <span
                  className="text-xs tracking-[0.2em]"
                  style={{
                    fontFamily: "var(--font-accent)",
                    color: "rgba(160,120,40,0.35)",
                  }}
                >
                  건너뛰기
                </span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ color: "rgba(160,120,40,0.35)" }}
                >
                  ›
                </motion.div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* 하단 진행 바 */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(180,140,50,0.4), transparent)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="fade-out-warm"
          className="fixed inset-0 z-[200]"
          style={{ background: "oklch(0.96 0.02 80)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
      )}
    </AnimatePresence>
  );
}
