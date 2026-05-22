export const TEXT_SIZE_OPTIONS = ["auto", "small", "normal", "large"] as const;

export type TextDisplaySize = (typeof TEXT_SIZE_OPTIONS)[number];

export function normalizeTextDisplaySize(
  value: string | null | undefined
): TextDisplaySize {
  return TEXT_SIZE_OPTIONS.includes(value as TextDisplaySize)
    ? (value as TextDisplaySize)
    : "auto";
}

export function getNarrativeFontSize(
  value: string,
  size: TextDisplaySize
): string {
  if (size === "small") return "clamp(1rem, 1.6vw, 1.35rem)";
  if (size === "normal") return "clamp(1.12rem, 1.9vw, 1.65rem)";
  if (size === "large") return "clamp(1.3rem, 2.3vw, 2rem)";

  const length = value.replace(/\s/g, "").length;
  if (length <= 14) return "clamp(1.3rem, 2.5vw, 2.1rem)";
  if (length <= 28) return "clamp(1.16rem, 2vw, 1.7rem)";
  return "clamp(1rem, 1.6vw, 1.35rem)";
}
