/**
 * OrnamentDivider — 골드 장식 구분선
 * Design: Royal Chronicle — 바로크 스타일 골드 라인 디바이더
 */

interface OrnamentDividerProps {
  className?: string;
  symbol?: string;
}

export default function OrnamentDividerDark({ className = "", symbol = "✦" }: OrnamentDividerProps) {
  return (
    <div className={`flex items-center justify-center gap-4 py-8 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="flex items-center gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold opacity-60">
          <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z" fill="currentColor" />
        </svg>
        <span
          className="text-gold text-xl font-display"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {symbol}
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold opacity-60">
          <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z" fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
    </div>
  );
}
