/**
 * PastorIntroSection — 목사님 소개 섹션 (Warm Chronicle 스타일)
 * 히어로 섹션 바로 아래 배치. 증명사진 + 소개 문구 + 주요 정보
 */
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { PASTOR_INFO } from "@/data/pastorData";

const PORTRAIT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-portrait-official-aaKBhVAahMpHF6yfV758Ya.webp";

const infoItems = [
  { label: "교회", value: PASTOR_INFO.church },
  { label: "신앙 연수", value: `${PASTOR_INFO.ministryYears}년` },
  { label: "장로 재직", value: "35년" },
  { label: "자녀", value: "3명" },
];

export default function PastorIntroSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="pastor-intro"
      ref={ref}
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: "oklch(0.97 0.015 80)" }}
    >
      {/* 배경 장식 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(180,140,50,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 md:px-12">
        {/* 섹션 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <p
            className="text-gold-dark/40 text-xs tracking-[0.5em] uppercase mb-3"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Pastor Profile
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="text-gold-dark/50 text-lg">✝</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </motion.div>

        {/* 메인 콘텐츠: 좌측 사진 + 우측 소개 */}
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* 증명사진 */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-shrink-0"
          >
            <div className="relative">
              {/* 따뜻한 골드 액자 */}
              <div
                className="absolute -inset-3 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(180,140,50,0.5) 0%, rgba(220,190,100,0.2) 50%, rgba(180,140,50,0.5) 100%)",
                  padding: "2px",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="w-full h-full rounded-xl"
                  style={{ background: "oklch(0.97 0.015 80)" }}
                />
              </div>
              {/* 그림자 효과 */}
              <div
                className="absolute -inset-3 rounded-xl opacity-30"
                style={{
                  boxShadow: "0 8px 40px rgba(180,140,50,0.3)",
                }}
              />
              <img
                src={PORTRAIT_URL}
                alt="김영수 장로님 증명사진"
                className="relative w-52 md:w-64 rounded-xl object-cover shadow-xl"
                style={{
                  aspectRatio: "3/4",
                  filter: "brightness(1.02) saturate(1.05)",
                }}
              />
              {/* 하단 이름 배지 */}
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-center whitespace-nowrap"
                style={{
                  background: "linear-gradient(90deg, rgba(180,140,50,0.9), rgba(160,120,40,0.9))",
                  boxShadow: "0 4px 15px rgba(180,140,50,0.3)",
                }}
              >
                <span
                  className="text-white text-xs font-bold tracking-widest"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  {PASTOR_INFO.fullTitle}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 소개 텍스트 */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="flex-1 text-center md:text-left mt-6 md:mt-0"
          >
            {/* 이름 */}
            <h2
              className="text-4xl md:text-5xl font-bold gold-gradient-text mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {PASTOR_INFO.name}
            </h2>
            <p
              className="text-gold-dark/50 text-sm tracking-[0.3em] mb-6"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              {PASTOR_INFO.typedTitle}
            </p>

            {/* 구분선 */}
            <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
              <div className="h-px w-8 bg-gold/50" />
              <div className="w-1 h-1 rounded-full bg-gold-dark/60" />
              <div className="h-px w-8 bg-gold/50" />
            </div>

            {/* 소개 문구 */}
            <p
              className="text-warm-brown/70 text-base md:text-lg leading-relaxed mb-8"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {PASTOR_INFO.ministryYears}년간 믿음으로 살아온 한 성도의 아름다운 이야기,
              <br className="hidden md:block" />
              {PASTOR_INFO.church}를 평생 섬겨온 장로님의
              <br className="hidden md:block" />
              헌신과 사랑의 여정을 기념합니다.
            </p>

            {/* 주요 정보 그리드 */}
            <div className="grid grid-cols-2 gap-3">
              {infoItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                  className="rounded-xl px-4 py-3 text-center md:text-left"
                  style={{
                    background: "rgba(180,140,50,0.07)",
                    border: "1px solid rgba(180,140,50,0.2)",
                  }}
                >
                  <p
                    className="text-gold-dark/40 text-xs tracking-wider mb-1"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-gold-dark text-base font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 하단 성경 구절 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div
            className="inline-block px-8 py-5 rounded-2xl"
            style={{
              background: "rgba(180,140,50,0.05)",
              border: "1px solid rgba(180,140,50,0.15)",
            }}
          >
            <p
              className="text-warm-brown/60 text-sm italic leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              "{PASTOR_INFO.heroQuote}"
            </p>
            <p
              className="text-gold-dark/40 text-xs mt-2 tracking-widest"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              — {PASTOR_INFO.heroQuoteRef}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
