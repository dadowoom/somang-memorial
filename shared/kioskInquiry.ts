/**
 * 키오스크 "문의" (2026-09-16).
 * 관람객이 자기 전화번호를 남기면 추모관 제작 업체 메일로 보내 주고, 업체가 보고 전화한다.
 * 여기에는 서버와 화면이 같이 쓰는 전화번호 정리 규칙만 둔다.
 */

/** 숫자만 남긴다. */
export function phoneDigits(input: string) {
  return input.replace(/\D/g, "");
}

/**
 * 한국 전화번호로 볼 수 있으면 `010-1234-5678` 꼴로 돌려주고, 아니면 null.
 * 휴대전화(010·011·016·017·018·019)와 지역번호(02, 03x~06x) 유선 전화를 받는다.
 */
export function normalizeKoreanPhone(input: string): string | null {
  const digits = phoneDigits(input);
  if (digits.length < 9 || digits.length > 11) return null;
  if (!digits.startsWith("0")) return null;

  if (/^01[016789]\d{7,8}$/.test(digits)) {
    const head = digits.slice(0, 3);
    const tail = digits.slice(-4);
    const mid = digits.slice(3, -4);
    return `${head}-${mid}-${tail}`;
  }
  if (/^02\d{7,8}$/.test(digits)) {
    return `02-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  }
  if (/^0[3-6]\d{8,9}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
  }
  return null;
}

/** 입력 중인 숫자를 보기 좋게 끊어 보여 준다 (저장값이 아니라 화면용). */
export function formatPhoneWhileTyping(input: string) {
  const digits = phoneDigits(input).slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export const KIOSK_INQUIRY_NAME_MAX = 40;
export const KIOSK_INQUIRY_STATUSES = ["new", "contacted"] as const;
export type KioskInquiryStatus = (typeof KIOSK_INQUIRY_STATUSES)[number];
