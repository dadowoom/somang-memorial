/**
 * 출생일과 소천일을 함께 보여줍니다.
 *
 * 소천 전에 미리 추모관을 준비하는 경우가 있어 소천일은 비어 있을 수 있습니다.
 * 그때 "1960-11-10 - " 처럼 꼬리가 남지 않도록 합니다.
 */
const FULL_DATE = /^\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}$/;
const YEAR_PREFIX = /^(\d{4})/;

/** 연도만 남깁니다. 연도로 시작하지 않는 값은 그대로 둡니다. */
function toYear(value: string) {
  const year = YEAR_PREFIX.exec(value);
  return year ? year[1] : value;
}

export function formatLifespan(
  birthDate?: string | null,
  deathDate?: string | null
) {
  const birth = (birthDate ?? "").trim();
  const death = (deathDate ?? "").trim();

  if (!birth || !death) return birth || death || "";

  // 한쪽만 온전한 날짜면 "1930 - 2008-02-06" 처럼 어긋나 보인다. 출생 연도만
  // 아는 분이 드물지 않은데, 그럴 때 소천일만 정확히 적히면 잘못 적은 것처럼
  // 읽힌다. 아는 만큼만, 양쪽을 같은 단위로 맞춘다.
  if (FULL_DATE.test(birth) && FULL_DATE.test(death)) {
    return `${birth} - ${death}`;
  }

  return `${toYear(birth)} - ${toYear(death)}`;
}

/**
 * 소천일을 부고 문구에 넣을 형태로 다듬습니다.
 *
 * 소천일은 "2026-05-20" 처럼 온전히 적히기도 하고, 아직 날짜를 모를 때는
 * "2026" 처럼 연도만 적히기도 합니다. 연도만 있을 때 그대로 두면
 * "2026 소천하셨기에" 가 되어 어색하므로 "2026년에" 로 조사를 붙입니다.
 */
export function formatPassingDate(value?: string | null) {
  const text = (value ?? "").trim();

  const full = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/.exec(text);
  if (full) return `${full[1]}년 ${Number(full[2])}월 ${Number(full[3])}일`;

  const yearMonth = /^(\d{4})[.\-/](\d{1,2})$/.exec(text);
  if (yearMonth) return `${yearMonth[1]}년 ${Number(yearMonth[2])}월에`;

  const year = /^(\d{4})$/.exec(text);
  if (year) return `${year[1]}년에`;

  return text;
}
