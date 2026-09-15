import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function MemorialBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 400);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="memorial-back-to-top"
      onClick={() => {
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        window.scrollTo({
          top: 0,
          behavior: reducedMotion ? "instant" : "smooth",
        });
      }}
    >
      <ArrowUp size={20} aria-hidden="true" />
      <span>맨 위로</span>
    </button>
  );
}
