/**
 * VideoSection — 영상 기록 섹션 (Warm Chronicle)
 * Design: Warm Chronicle
 * - 유튜브 영상 임베드 지원
 * - YOUTUBE_VIDEO_ID가 없을 경우 고급스러운 플레이스홀더 표시
 */
import { YOUTUBE_VIDEO_ID, PASTOR_INFO } from "@/data/pastorData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

export default function VideoSection() {
  const { ref, isVisible } = useScrollReveal();

  if (!YOUTUBE_VIDEO_ID) {
    return (
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 parchment-bg" />
        <div ref={ref} className="relative z-10 container mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="warm-card rounded-xl p-8 text-center"
          >
            <Play className="w-8 h-8 text-gold-dark/30 mx-auto mb-3" />
            <p
              className="text-warm-brown/40 text-sm italic"
              style={{ fontFamily: "var(--font-serif-kr)" }}
            >
              영상이 준비되면 이곳에서 볼 수 있습니다
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="video" className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream-dark/30 to-cream" />

      <div ref={ref} className="relative z-10 container mx-auto max-w-5xl px-4">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Play className="w-5 h-5 text-gold-dark/50" />
            <p
              className="text-gold-dark/50 text-sm tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Video Archive
            </p>
          </div>
          <h2
            className="text-3xl md:text-5xl font-bold gold-gradient-text mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            영상 기록
          </h2>
          <p
            className="text-warm-brown/50 text-sm md:text-base"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            {PASTOR_INFO.fullTitle}의 소중한 순간들
          </p>
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          {/* Gold frame glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-gold/40 via-gold-dark/20 to-gold/40 blur-sm" />
          <div className="absolute -inset-0.5 rounded-2xl border border-gold/30" />

          {/* YouTube embed */}
          <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
              title={`${PASTOR_INFO.fullTitle} 영상 기록`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>

          {/* Caption */}
          <div className="mt-4 text-center">
            <p
              className="text-warm-brown/40 text-xs tracking-wider"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              ✝ {PASTOR_INFO.church} · {PASTOR_INFO.fullTitle}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
