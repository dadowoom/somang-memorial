/**
 * 감사기록(note)에 넣을 개인정보 가리기.
 *
 * 감사기록은 관리자 화면에 그대로 보이고 오래 남는다. 누가 무엇을 했는지
 * 알아볼 정도만 남기고, 전화번호·이메일 전체는 적지 않는다 (2026-09-14).
 */

/** 010-1234-5678 → 010-****-5678. 숫자가 8자 미만이면 전부 가린다. */
export function maskPhoneForAudit(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/** somang@example.org → so***@example.org. 골뱅이가 없으면 전부 가린다. */
export function maskEmailForAudit(email: string | null | undefined) {
  if (!email) return "(이메일 없음)";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const shown = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${shown}***${domain}`;
}
