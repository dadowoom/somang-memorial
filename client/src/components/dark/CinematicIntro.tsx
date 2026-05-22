/**
 * CinematicIntro — 시네마틱 인트로 로딩 화면
 * Design: Royal Chronicle
 * - 완전한 어둠에서 시작 → 중앙에서 빛이 퍼져나옴
 * - 십자가가 빛과 함께 각인되듯 등장
 * - 이름이 금빛으로 천천히 새겨짐
 * - 하단에 은은한 스킵 버튼
 * - 총 5초 자동 종료 (스킵 가능)
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface CinematicIntroProps {
  onComplete: () => void;
  pastorName?: string;
}

// 빛 줄기 컴포넌트 (중앙에서 방사형으로 퍼지는 빛)
function LightRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 origin-left"
      style={{
        width: "60vmax",
        height: "1px",
        rotate: `${angle}deg`,
        translateX: "-0%",
        translateY: "-50%",
        background:
          "linear-gradient(90deg, rgba(201,168,76,0.0) 0%, rgba(201,168,76,0.15) 30%, rgba(255,240,180,0.08) 70%, transparent 100%)",
      }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 2.5, delay, ease: "easeOut" }}
    />
  );
}

// 파티클 하나
function GlowParticle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: "radial-gradient(circle, rgba(255,240,180,0.9) 0%, rgba(201,168,76,0.3) 60%, transparent 100%)",
        boxShadow: `0 0 ${size * 3}px rgba(201,168,76,0.6)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0.6, 0],
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
  { x: 38, y: 48, delay: 1.7, size: 2 },
  { x: 62, y: 52, delay: 1.8, size: 2 },
];

const LIGHT_RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => ({
  angle,
  delay: 0.5 + i * 0.05,
}));

export default function CinematicIntro({ onComplete, pastorName }: CinematicIntroProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // 1.5초 후 스킵 버튼 표시
    const skipTimer = setTimeout(() => setShowSkip(true), 1500);
    // 5초 후 자동 종료
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
          key="cinematic-intro"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{ background: "oklch(0.06 0.02 260)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          {/* 중앙 빛 폭발 — 방사형 빛줄기 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {LIGHT_RAYS.map(({ angle, delay }) => (
              <LightRay key={angle} angle={angle} delay={delay} />
            ))}
          </div>

          {/* 중앙 글로우 원 */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "40vmin",
              height: "40vmin",
              background:
                "radial-gradient(circle, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 50%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.8, 0.5] }}
            transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
          />

          {/* 파티클들 */}
          <div className="absolute inset-0 pointer-events-none">
            {PARTICLES.map((p, i) => (
              <GlowParticle key={i} {...p} />
            ))}
          </div>

          {/* 메인 콘텐츠 */}
          <div className="relative z-10 text-center select-none">
            {/* 십자가 — 빛과 함께 각인 */}
            <motion.div
              initial={{ scale: 2, opacity: 0, filter: "blur(20px)" }}
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
                  filter: "drop-shadow(0 0 30px rgba(201,168,76,0.8)) drop-shadow(0 0 60px rgba(201,168,76,0.4))",
                }}
                animate={{
                  filter: [
                    "drop-shadow(0 0 30px rgba(201,168,76,0.8)) drop-shadow(0 0 60px rgba(201,168,76,0.4))",
                    "drop-shadow(0 0 50px rgba(255,240,180,1)) drop-shadow(0 0 100px rgba(201,168,76,0.6))",
                    "drop-shadow(0 0 20px rgba(201,168,76,0.6)) drop-shadow(0 0 40px rgba(201,168,76,0.3))",
                  ],
                }}
                transition={{ duration: 3, delay: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff0b4" stopOpacity="1" />
                    <stop offset="50%" stopColor="#c9a84c" stopOpacity="1" />
                    <stop offset="100%" stopColor="#8a6420" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path d="M 54 8 Q 60 8 60 14 L 60 106 Q 60 112 54 112 Q 48 112 48 106 L 48 14 Q 48 8 54 8" fill="url(#goldGrad)" />
                <path d="M 8 54 Q 8 60 14 60 L 106 60 Q 112 60 112 54 Q 112 48 106 48 L 14 48 Q 8 48 8 54" fill="url(#goldGrad)" />
                <path d="M 51 10 Q 54 10 54 13 L 54 107 Q 54 110 51 110" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
                <path d="M 10 51 Q 10 54 13 54 L 107 54 Q 110 54 110 51" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
              </motion.svg>
            </motion.div>

            {/* 목회기념관 */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{ duration: 1.5, delay: 0.8 }}
              className="text-xs md:text-sm uppercase mb-4"
              style={{
                fontFamily: "var(--font-accent)",
                color: "rgba(201,168,76,0.5)",
              }}
            >
              신 앙 기 념 관
            </motion.p>

            {/* 이름 — 금빛 각인 효과 */}
            <div className="relative overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  background: "linear-gradient(135deg, #c9a84c 0%, #f5e6a3 40%, #c9a84c 60%, #a07830 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 20px rgba(201,168,76,0.5))",
                  letterSpacing: "0.15em",
                }}
              >
                {pastorName || "김요한 목사"}
              </motion.h1>
              {/* 이름 위로 지나가는 빛 스윕 */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
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
                background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)",
              }}
            />

            {/* Soli Deo Gloria */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 2.2 }}
              style={{
                fontFamily: "var(--font-accent)",
                color: "rgba(201,168,76,0.3)",
                letterSpacing: "0.3em",
                fontSize: "0.7rem",
              }}
            >
              Soli Deo Gloria
            </motion.p>
          </div>

          {/* 스킵 버튼 — 우측 하단에 은은하게 */}
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
                  className="text-xs tracking-[0.2em] transition-colors duration-300"
                  style={{
                    fontFamily: "var(--font-accent)",
                    color: "rgba(201,168,76,0.3)",
                  }}
                >
                  건너뛰기
                </span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ color: "rgba(201,168,76,0.3)" }}
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
              background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="fade-out"
          className="fixed inset-0 z-[200]"
          style={{ background: "oklch(0.06 0.02 260)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
      )}
    </AnimatePresence>
  );
}
