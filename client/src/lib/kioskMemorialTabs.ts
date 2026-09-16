/**
 * 키오스크 추모관 화면의 탭 (2026-09-16).
 *
 * 홈페이지 추모관 화면과 같은 이름·같은 순서다: 삶과 신앙 → 사진과 기록 → 편지 남기기
 * → 가족관 → 부고장. 홈페이지처럼 누른 탭의 내용만 보여 준다. 부고장은 소천일이 있을 때만.
 */
export type KioskMemorialTab =
  | "life"
  | "records"
  | "letters"
  | "family"
  | "obituary";

export const KIOSK_MEMORIAL_DEFAULT_TAB: KioskMemorialTab = "life";

export function kioskMemorialTabs(memorial: { deathDate: string }) {
  const tabs: Array<{ id: KioskMemorialTab; label: string }> = [
    { id: "life", label: "삶과 신앙" },
    { id: "records", label: "사진과 기록" },
    { id: "letters", label: "편지 남기기" },
    { id: "family", label: "가족관" },
  ];
  if (memorial.deathDate.trim()) tabs.push({ id: "obituary", label: "부고장" });
  return tabs;
}

/** 소천일 "2026-03-01" → "2026년 3월 1일". 형식이 다르면 그대로. */
export function formatPassingDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return value.trim();
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}
