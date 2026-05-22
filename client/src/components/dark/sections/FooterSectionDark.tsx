/**
 * FooterSection — 하단 푸터
 * Design: Royal Chronicle
 * - 간결한 골드 라인 + 저작권 표시
 */
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function FooterSectionDark() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <footer ref={ref} className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-navy-deep" />
      <div className="relative z-10 container mx-auto max-w-4xl text-center">
        {/* Gold ornament */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        >
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-6" />

          <p
            className="text-gold/30 text-xs md:text-sm tracking-[0.2em]"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Soli Deo Gloria
          </p>
          <p
            className="text-ivory/20 text-xs mt-3"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            오직 하나님께 영광
          </p>

          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mx-auto mt-6 mb-4" />

          <p
            className="text-ivory/15 text-xs"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            © {new Date().getFullYear()} 이순자 권사 신앙기념관
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
