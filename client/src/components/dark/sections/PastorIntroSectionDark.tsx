/**
 * PastorIntroSectionDark — 목사님 소개 섹션 (Royal Chronicle 스타일)
 * 히어로 섹션 바로 아래 배치. 증명사진 + 소개 문구 + 주요 정보
 */
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const DEFAULT_PORTRAIT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-portrait-official-aaKBhVAahMpHF6yfV758Ya.webp";

const DEFAULT_QUOTE = "내가 달려갈 길과 주 예수께 받은 사명 곧 하나님의 은혜의 복음을 증언하는 일을 마치려 함에는 나의 생명조차 조금도 귀한 것으로 여기지 아니하노라";
const DEFAULT_QUOTE_REF = "사도행전 20:24";

interface PastorIntroSectionDarkProps {
  name: string;
  church: string;
  title?: string;   // 직함 (없으면 church를 사용)
  ministryYears?: number | null;
  churchMembers?: number | null;
  photoUrl?: string | null;
  description?: string | null;
  heroQuote?: string | null;
  heroQuoteRef?: string | null;
}

export default function PastorIntroSectionDark({
  name,
  church,
  title,
  ministryYears,
  churchMembers,
  photoUrl,
  description,
  heroQuote,
  heroQuoteRef,
}: PastorIntroSectionDarkProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const portraitUrl = photoUrl || DEFAULT_PORTRAIT;
  const quote = heroQuote || DEFAULT_QUOTE;
  const quoteRef = heroQuoteRef || DEFAULT_QUOTE_REF;

  const infoItems = [
    { label: "교회", value: church },
    ...(ministryYears ? [{ label: "신앙 연수", value: `${ministryYears}년` }] : []),
    ...(churchMembers ? [{ label: "성도 수", value: `${churchMembers.toLocaleString()}명` }] : []),
  ];

  return (
    <section
      id="pastor-intro"
      ref={ref}
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: "oklch(0.12 0.03 260)" }}
    >
      {/* 배경 장식 빛 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)",
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
            className="text-gold/50 text-xs tracking-[0.5em] uppercase mb-3"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Pastor Profile
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <span className="text-gold/60 text-lg font-light">†</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
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
              {/* 골드 액자 효과 */}
              <div
                className="absolute -inset-3 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.1) 40%, rgba(201,168,76,0.6) 100%)",
                  padding: "2px",
                }}
              >
                <div
                  className="w-full h-full rounded-lg"
                  style={{ background: "oklch(0.12 0.03 260)" }}
                />
              </div>
              {/* 빛나는 테두리 */}
              <div
                className="absolute -inset-3 rounded-lg opacity-40"
                style={{
                  boxShadow: "0 0 30px rgba(201,168,76,0.4), inset 0 0 20px rgba(201,168,76,0.1)",
                }}
              />
              <img
                src={portraitUrl}
                alt={`${name} 권사님 증명사진`}
                className="relative w-52 md:w-64 rounded-lg object-cover shadow-2xl"
                style={{
                  aspectRatio: "3/4",
                  filter: "brightness(1.05) contrast(1.02)",
                }}
              />
              {/* 하단 이름 배지 */}
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-center whitespace-nowrap"
                style={{
                  background: "linear-gradient(90deg, rgba(201,168,76,0.9), rgba(180,140,50,0.9))",
                  boxShadow: "0 4px 15px rgba(201,168,76,0.4)",
                }}
              >
                <span
                  className="text-[oklch(0.1_0.03_260)] text-xs font-bold tracking-widest"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  {title || church}
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
              {name}
            </h2>
            <p
              className="text-gold/50 text-sm tracking-[0.3em] mb-6"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              {title || church}
            </p>

            {/* 구분선 */}
            <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
              <div className="h-px w-8 bg-gold/40" />
              <div className="w-1 h-1 rounded-full bg-gold/60" />
              <div className="h-px w-8 bg-gold/40" />
            </div>

            {/* 소개 문구 */}
            <p
              className="text-[rgba(240,235,220,0.7)] text-base md:text-lg leading-relaxed mb-8"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {description || `하나님의 사랑 안에서 \n${church}를 성실히 섯기며 살아온\n헌신과 기도의 여정을 기념합니다.`}
            </p>

            {/* 주요 정보 그리드 */}
            {infoItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {infoItems.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                    className="rounded-lg px-4 py-3 text-center md:text-left"
                    style={{
                      background: "rgba(201,168,76,0.07)",
                      border: "1px solid rgba(201,168,76,0.2)",
                    }}
                  >
                    <p
                      className="text-gold/40 text-xs tracking-wider mb-1"
                      style={{ fontFamily: "var(--font-accent)" }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-gold text-base font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {item.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
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
            className="inline-block px-8 py-4 rounded-lg"
            style={{
              background: "rgba(201,168,76,0.05)",
              border: "1px solid rgba(201,168,76,0.15)",
            }}
          >
            <p
              className="text-[rgba(240,235,220,0.5)] text-sm italic leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              "{quote}"
            </p>
            <p
              className="text-gold/40 text-xs mt-2 tracking-widest"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              — {quoteRef}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
