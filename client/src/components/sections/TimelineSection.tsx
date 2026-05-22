/**
 * TimelineSection — 연혁 타임라인 (사진 포함)
 * Design: Royal Chronicle
 * - 중앙 골드 라인 + 좌우 교차 카드 (각 카드에 사진)
 * - 스크롤 시 카드가 좌/우에서 슬라이드 인
 * - 각 카드에 골드 보더 글로우
 * - 모바일: 단일 컬럼
 */
import OrnamentDivider from "@/components/OrnamentDivider";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";

const ORNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-ornament-jiogLJBackAfv3ySZcEuM4.webp";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  icon: string;
  image: string;
}

const events: TimelineEvent[] = [
  {
    year: "1960",
    title: "서울에서 출생",
    description: "서울 종로구에서 3남 1녀 중 장남으로 태어남. 어린 시절부터 성실하고 책임감 있는 성품으로 가족의 기둥이 됨.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1960-birth-NvHFjMhbkShuy6VamaHCgB.webp",
  },
  {
    year: "1978",
    title: "고등학교 졸업",
    description: "서울 경복고등학교를 졸업하고 건축공학과에 진학. 학창 시절 교회 청년부에서 처음 신앙생활을 시작함.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1978-graduation-JmqcKPNeti3hq9t83zqpGw.webp",
  },
  {
    year: "1983",
    title: "세례 받음",
    description: "소망교회에서 세례를 받고 본격적인 신앙의 여정을 시작. 이때부터 매주 빠짐없이 예배에 참석하는 삶을 살아감.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1983-baptism-ePHFdmvLiFTZ5bY9GtQG6s.webp",
  },
  {
    year: "1986",
    title: "결혼",
    description: "같은 교회 성도인 이은혜 권사님과 결혼. 두 사람은 함께 신앙 안에서 가정을 세워나가기 시작함.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1986-wedding-cVXKVgdCmSk5LuxoMHPUBV.webp",
  },
  {
    year: "1988",
    title: "건축사무소 개업",
    description: "종합건축사무소 '요한건설'을 설립. 성실한 경영 철학으로 지역사회에서 신뢰받는 기업으로 성장시킴.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1988-architecture-ZqebyeA2KDVevNcZknics3.webp",
  },
  {
    year: "1995",
    title: "집사 임명",
    description: "소망교회 집사로 임명되어 교회 건축 위원회와 재정 위원회에서 헌신적으로 봉사를 시작함.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-1995-deacon-2WfRRnxtr6TBqggrjkXfkH.webp",
  },
  {
    year: "2005",
    title: "장로 임직",
    description: "교회와 성도들의 추천으로 장로로 임직. 20년 넘게 한결같은 신앙과 섬김의 결실을 맺은 순간.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-2005-elder-LW8Q7t3uPKpbTk37UqeqdF.webp",
  },
  {
    year: "2010",
    title: "해외 선교 참여",
    description: "필리핀, 캄보디아 등 동남아시아 선교에 참여. 현지 교회 건축을 직접 설계하고 지원하는 사역을 이어감.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-2010-mission-h8q3mQNJVyotvhUm6FPPpw.webp",
  },
  {
    year: "2018",
    title: "은퇴 후 봉사 전념",
    description: "건축사무소를 후배에게 인계하고 은퇴. 이후 교회 봉사와 지역사회 나눔 활동에 전념하며 제2의 삶을 시작함.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-2018-retire-3aJTG8JGq8sj57qYjahmUD.webp",
  },
  {
    year: "현재",
    title: "신앙의 여정은 계속됩니다",
    description: "손자녀 3명의 자랑스러운 할아버지이자, 소망교회의 든든한 기둥으로 오늘도 묵묵히 신앙의 길을 걸어가고 있음.",
    icon: "✝",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/timeline-present-VM9SrbDeekzb4bSd6qctAS.webp",
  },
];

function TimelineCard({ event, index }: { event: TimelineEvent; index: number }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.15 });
  const isLeft = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={`relative flex items-start w-full mb-12 md:mb-20 ${
        isLeft ? "md:flex-row" : "md:flex-row-reverse"
      } flex-row`}
    >
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -100 : 100, y: 30 }}
        animate={isVisible ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`w-full md:w-[calc(50%-2.5rem)] ${isLeft ? "md:pr-0" : "md:pl-0"}`}
      >
        <div className="gold-border-glow rounded-lg overflow-hidden bg-navy/80 backdrop-blur-sm hover:shadow-[0_0_40px_rgba(201,168,76,0.25)] transition-all duration-700 group">
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
            {/* Year badge overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span
                className="text-gold text-xl md:text-2xl font-bold tracking-wider text-glow"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {event.year}
              </span>
            </div>
          </div>

          {/* Text content */}
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

export default function TimelineSection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();

  return (
    <section id="timeline" className="relative py-20 md:py-32">
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
            Life Chronicle
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            인생의 연대기
          </motion.h2>
          {/* Ornament image */}
          <motion.img
            src={ORNAMENT_IMG}
            alt="ornament"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={titleVisible ? { opacity: 0.5, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-48 md:w-64 mx-auto"
          />
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line (desktop) */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />

          {/* Events */}
          {events.map((event, i) => (
            <TimelineCard key={i} event={event} index={i} />
          ))}
        </div>

        <OrnamentDivider className="mt-8" />
      </div>
    </section>
  );
}
