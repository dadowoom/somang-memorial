/**
 * QuoteSection — 감사의 말씀
 * Design: Warm Chronicle — 밝고 따뜻한 톤
 * - 수채화 배경 + 인용구 강조
 * - 패럴렉스 배경
 */
import { QUOTE, PASTOR_INFO } from "@/data/pastorData";
import OrnamentDivider from "@/components/OrnamentDivider";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const QUOTE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/warm-quote-bg-MuDpG46ZD7Wy9KWEEu5XS6.webp";

export default function QuoteSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="quote" className="relative py-24 md:py-36 overflow-hidden">
      {/* Warm watercolor background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed bg-no-repeat"
        style={{ backgroundImage: `url(${QUOTE_BG})` }}
      />
      <div className="absolute inset-0 bg-cream/40 backdrop-blur-[1px]" />

      <div ref={ref} className="relative z-10 container mx-auto max-w-4xl px-4 text-center">
        {/* Quote icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isVisible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Quote className="w-12 h-12 md:w-16 md:h-16 text-gold-dark/30 mx-auto" />
        </motion.div>

        {/* Main quote */}
        <motion.blockquote
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <p
            className="text-xl md:text-3xl lg:text-4xl text-warm-brown leading-relaxed md:leading-relaxed"
            style={{ fontFamily: "var(--font-serif-kr)", fontWeight: 400 }}
          >
            "{QUOTE.text}"
          </p>
        </motion.blockquote>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isVisible ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: 0.8 }}
          className="w-24 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto my-8"
        />

        {/* Attribution */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-gold-dark/50 text-base md:text-lg"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          — {PASTOR_INFO.fullTitle}
        </motion.p>

        <OrnamentDivider className="mt-16" symbol="✙" />
      </div>
    </section>
  );
}
