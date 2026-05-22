/**
 * FooterSection — 하단 푸터
 * Design: Warm Chronicle — 밝고 따뜻한 톤
 */
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function FooterSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <footer ref={ref} className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-parchment to-cream-dark" />
      <div className="relative z-10 container mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        >
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mx-auto mb-6" />

          <p
            className="text-gold-dark/40 text-xs md:text-sm tracking-[0.2em]"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Soli Deo Gloria
          </p>
          <p
            className="text-warm-brown/30 text-xs mt-3"
            style={{ fontFamily: "var(--font-serif-kr)" }}
          >
            오직 하나님께 영광
          </p>

          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mx-auto mt-6 mb-4" />

          <p
            className="text-warm-brown/20 text-xs"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            &copy; {new Date().getFullYear()} 김영수 장로 기념관
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
