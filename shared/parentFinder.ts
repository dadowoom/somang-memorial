export const SOMANG_INTERMENT_BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeIntermentName(value: string) {
  return value.replace(/\s+/g, "").trim();
}

/**
 * 원본 엑셀의 이름 열에는 직분과 출처 표시가 섞여 있다(전체의 약 13%).
 * 예: `이한수 장로(타)`, `국현주 권사(은256)`, `김문숙(김서은) 집사`
 */
const INTERMENT_NAME_SUFFIXES = [
  "은퇴안수집사",
  "집사 아가",
  "원로장로",
  "은퇴장로",
  "명예장로",
  "협동장로",
  "원로권사",
  "은퇴권사",
  "명예권사",
  "안수집사",
  "은퇴집사",
  "(타교)권사",
  "타교권사",
  "선교사",
  "전도사",
  "목사",
  "사모",
  "장로",
  "권사",
  "집사",
  "성도",
  "교우",
  "아가",
  "님",
] as const;

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const INTERMENT_NAME_SUFFIX_PATTERN = new RegExp(
  `\\s+(?:${INTERMENT_NAME_SUFFIXES.map(escapeRegularExpression).join("|")})` +
    `(?:\\s*(?:\\([^)]*\\)|타\\)))?\\s*$`
);

const EXTERNAL_BAPTISMAL_NAME_PATTERN = /^(\S{2,5})\s+\S+\(타\)$/;
const PARENTHESIZED_ALIAS_PATTERN = /^([^()]+?)\s*\([^)]*\)(?:타)?$/;

/**
 * Keeps the person's actual name while removing role and source-only labels
 * that were historically stored in the Excel name column. Used for what the
 * family sees, and for the memorial that gets created from a record.
 *
 * It deliberately does not truncate to three characters: Korean names in the
 * source include legitimate two- and four-character names.
 *
 * This is NOT interchangeable with normalizeIntermentName above. That one
 * mirrors how the importer filled the stored `nameNormalized` column, which
 * still carries the titles, so it is what database comparisons must use.
 */
export function getIntermentPersonName(value: string) {
  let name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  name = name.replace(INTERMENT_NAME_SUFFIX_PATTERN, "").trim();

  const externalBaptismalName = name.match(EXTERNAL_BAPTISMAL_NAME_PATTERN);
  if (externalBaptismalName) {
    name = externalBaptismalName[1];
  }

  const parenthesizedAlias = name.match(PARENTHESIZED_ALIAS_PATTERN);
  if (parenthesizedAlias) {
    name = parenthesizedAlias[1].trim();
  }

  const personName = name.replace(/\s+/g, "");

  // A record like `김 권사` would be stripped down to a single character, which
  // no longer identifies anyone and fails the two-character input rule when the
  // family tries to create a memorial. Showing the raw name is the safer miss.
  if (personName.length < 2) {
    return value.replace(/\s+/g, "").trim();
  }

  return personName;
}

/**
 * Compares two names by the person behind them, so a cleaned-up name the
 * family sent back still matches the raw record it came from.
 */
export function isSameIntermentPersonName(left: string, right: string) {
  return getIntermentPersonName(left) === getIntermentPersonName(right);
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
