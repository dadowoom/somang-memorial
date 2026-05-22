/**
 * VideoSection — 목회 영상 섹션
 * Design: Royal Chronicle
 * - 유튜브 임베드 지원
 * - 골드 프레임으로 감싸진 비디오 플레이어
 * - 목사님 유튜브 영상 사용
 */
import { YOUTUBE_VIDEO_ID, PERSON_INFO } from "@/data/kwonSaData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";
import { Film } from "lucide-react";

export default function VideoSectionDark() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal();

  if (!YOUTUBE_VIDEO_ID) {
    return (
      <section id="video" className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />
        <div className="relative z-10 container mx-auto max-w-4xl">
          <div ref={titleRef} className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={titleVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="gold-border-glow rounded-xl p-10 md:p-16 bg-navy/40 backdrop-blur-sm"
            >
              <Film className="w-12 h-12 text-gold/30 mx-auto mb-4" />
              <p className="text-gold/40 text-sm md:text-base italic" style={{ fontFamily: "var(--font-accent)" }}>
                이곳에 소중한 영상을 추가할 수 있습니다
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="video" className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />
      <div className="relative z-10 container mx-auto max-w-4xl">
        <div ref={titleRef} className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-gold/60 text-sm tracking-[0.3em] uppercase mb-4"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Ministry Video
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl md:text-5xl font-bold gold-gradient-text text-glow"
            style={{ fontFamily: "var(--font-display)" }}
          >
            목회의 순간들
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={titleVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-ivory/40 text-sm mt-3"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {PERSON_INFO.fullTitle}님을 기억하며
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={titleVisible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="gold-border-glow rounded-xl overflow-hidden"
          style={{ boxShadow: "0 0 60px rgba(201,168,76,0.2)" }}
        >
          {/* Gold top bar */}
          <div className="bg-gradient-to-r from-gold/20 via-gold/40 to-gold/20 h-1" />
          <div className="relative aspect-video bg-navy-deep">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1&color=white`}
              title="목회 영상"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          {/* Gold bottom bar */}
          <div className="bg-gradient-to-r from-gold/20 via-gold/40 to-gold/20 h-1" />
        </motion.div>
      </div>
    </section>
  );
}
