/**
 * ServiceSection — 목회의 발자취
 * Design: Royal Chronicle
 * - 카운터 숫자 올라가는 애니메이션
 * - 골드 아이콘 카드
 * - 스크롤 트리거
 * - 목사님 목회 통계 데이터 사용
 */
import { SERVICE_STATS, PERSON_INFO } from "@/data/kwonSaData";
import OrnamentDivider from "@/components/dark/OrnamentDividerDark";
import { useCountUp, useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";

const SERVICE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/service-bg-JqAVifdmGrXLqBJPcEdwTc.webp";

interface ServiceStat {
  label: string;
  value: number;
  suffix: string;
  icon: string;
}

const stats: ServiceStat[] = SERVICE_STATS;

function StatCard({ stat, index }: { stat: ServiceStat; index: number }) {
  const { ref, count, isVisible } = useCountUp(stat.value, 2000);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1 }}
      className="gold-border-glow rounded-lg p-6 bg-navy/60 backdrop-blur-sm text-center hover:shadow-[0_0_30px_rgba(201,168,76,0.2)] transition-all duration-500 group"
    >
      <span className="text-gold/50 text-2xl block mb-3 group-hover:scale-110 transition-transform duration-300" style={{ fontFamily: "var(--font-accent)" }}>
        †
      </span>
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span
          className="text-3xl md:text-4xl font-bold gold-gradient-text text-glow"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {count.toLocaleString()}
        </span>
        <span
          className="text-gold/70 text-lg"
          style={{ fontFamily: "var(--font-serif-kr)" }}
        >
          {stat.suffix}
        </span>
      </div>
      <h4
        className="text-gold-light text-base font-semibold"
        style={{ fontFamily: "var(--font-serif-kr)" }}
      >
        {stat.label}
      </h4>
    </motion.div>
  );
}

export default function ServiceSectionDark() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();

  return (
    <section id="service" className="relative py-20 md:py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${SERVICE_BG})` }}
      />
      <div className="absolute inset-0 bg-navy-deep/75" />

      <div className="relative z-10 container mx-auto max-w-6xl">
        {/* Section title */}
        <div ref={titleRef} className="text-center mb-14 md:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-gold/60 text-sm tracking-[0.3em] uppercase mb-4"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Ministry Legacy
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow"
            style={{ fontFamily: "var(--font-display)" }}
          >
            목회의 발자취
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={titleVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-ivory/40 text-sm mt-3"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {PERSON_INFO.faithYears}년의 신앙 여정이 남긴 하나님의 은혜
          </motion.p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} />
          ))}
        </div>

        <OrnamentDivider className="mt-16" symbol="♱" />
      </div>
    </section>
  );
}
