export const SOMANG_INTERMENT_BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeIntermentName(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export function isSearchableIntermentBirthDate(value: string) {
  if (
    !SOMANG_INTERMENT_BIRTH_DATE_PATTERN.test(value) ||
    value.endsWith("-00-00")
  ) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function formatMemorialDay(deathDate: string) {
  if (!isSearchableIntermentBirthDate(deathDate)) return null;
  return `매년 ${deathDate.slice(5, 7)}월 ${deathDate.slice(8, 10)}일`;
}

export function createIntermentMemorialCopy(input: {
  name: string;
  role: string | null;
  deathDate: string;
}) {
  const name = input.name.trim();
  const role = input.role?.trim() || "고인";

  return {
    role,
    summary: `소망동산에 안장되신 ${name}님의 삶을 기억합니다.`,
    story: `${name}님을 가족과 소망교회 공동체가 함께 기억합니다. 추모관을 완성하며 남기고 싶은 삶과 신앙의 이야기를 기록해 주세요.`,
    memorialDay: formatMemorialDay(input.deathDate),
  };
}
