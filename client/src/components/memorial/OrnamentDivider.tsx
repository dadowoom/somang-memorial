/**
 * OrnamentDivider — 따뜻한 골드 장식 구분선 (Warm Chronicle)
 */
interface OrnamentDividerProps {
  className?: string;
  symbol?: string;
}

export default function OrnamentDivider({ className = "", symbol = "✦" }: OrnamentDividerProps) {
  return (
    <div className={`flex items-center justify-center gap-4 py-8 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gold-dark opacity-40">
          <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z" fill="currentColor" />
        </svg>
        <span
          className="text-gold-dark text-lg opacity-60"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {symbol}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gold-dark opacity-40">
          <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z" fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </div>
  );
}
