/**
 * 관리자 화면에서 안장 기록 고치기 (2026-09-23).
 *
 * 교회에서 명단 수정 요청이 오면 전에는 다도움이 DB 를 직접 고쳤다. 이제 관리자
 * 화면에서 찾아 고치고, 새로 넣고, 잘못 들어간 기록을 지운다.
 *
 * 날짜는 DB 에 들어 있는 모양과 같게 맞춘다.
 *   모름        → 0000-00-00 (생년월일·소천일) / 비움 (안장일)
 *   연도만      → 1933-00-00
 *   연·월·일    → 1933-01-05
 * 입력은 "1933", "1933.1.5", "1933-01-05", "19330105" 를 모두 받는다.
 */
export const UNKNOWN_DATE = "0000-00-00";

export function normalizeIntermentDate(value: string): string | null {
  const text = value.trim();
  if (!text || text === UNKNOWN_DATE) return UNKNOWN_DATE;

  let year: string;
  let month = "00";
  let day = "00";
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  const parts = /^(\d{4})(?:[-./ ]+(\d{1,2})(?:[-./ ]+(\d{1,2}))?)?\.?$/.exec(
    text
  );
  if (compact) {
    [, year, month, day] = compact;
  } else if (parts) {
    year = parts[1];
    month = (parts[2] ?? "0").padStart(2, "0");
    day = (parts[3] ?? "0").padStart(2, "0");
  } else {
    return null;
  }

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < 1800 || y > 2100) return null;
  if (m > 12 || d > 31) return null;
  if (m === 0 && d !== 0) return null;
  if (m !== 0 && d !== 0) {
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  }
  return `${year}-${month}-${day}`;
}

export type IntermentAdminFields = {
  name: string;
  role: string;
  affiliation: string;
  pastor: string;
  funeralChurch: string;
  birthDate: string;
  deathDate: string;
  deathAge: string;
  burialPlace: string;
  burialDate: string;
};

export const INTERMENT_FIELD_LABELS: Record<
  keyof IntermentAdminFields,
  string
> = {
  name: "성함",
  role: "직분",
  affiliation: "소속",
  pastor: "담당 교역자",
  funeralChurch: "장례 교회",
  birthDate: "생년월일",
  deathDate: "소천일",
  deathAge: "향년",
  burialPlace: "장지",
  burialDate: "안장일",
};

export type CleanIntermentFields = {
  name: string;
  role: string | null;
  affiliation: string | null;
  pastor: string | null;
  funeralChurch: string | null;
  birthDate: string;
  deathDate: string;
  deathAge: string | null;
  burialPlace: string;
  burialDate: string | null;
};

/**
 * 입력을 DB 에 넣을 모양으로 다듬는다. 틀린 칸이 있으면 errors 에 칸 이름별로
 * 까닭을 담는다.
 */
export function cleanIntermentFields(input: IntermentAdminFields): {
  value: CleanIntermentFields | null;
  errors: Partial<Record<keyof IntermentAdminFields, string>>;
} {
  const errors: Partial<Record<keyof IntermentAdminFields, string>> = {};
  const text = (value: string) => value.trim().replace(/\s+/g, " ");
  const optional = (value: string) => text(value) || null;

  const name = text(input.name);
  if (name.length < 2) errors.name = "성함을 두 글자 이상 적어 주세요.";

  const birthDate = normalizeIntermentDate(input.birthDate);
  if (!birthDate) {
    errors.birthDate =
      "생년월일은 1933-01-05 처럼 적어 주세요. 연도만 알면 1933, 모르면 비워 두세요.";
  }
  const deathDate = normalizeIntermentDate(input.deathDate);
  if (!deathDate) {
    errors.deathDate =
      "소천일은 2020-05-22 처럼 적어 주세요. 모르면 비워 두세요.";
  }
  const burialRaw = input.burialDate.trim();
  const burialDate = burialRaw ? normalizeIntermentDate(burialRaw) : null;
  if (burialRaw && !burialDate) {
    errors.burialDate =
      "안장일은 2020-05-25 처럼 적어 주세요. 모르면 비워 두세요.";
  }
  if (
    birthDate &&
    deathDate &&
    birthDate !== UNKNOWN_DATE &&
    deathDate !== UNKNOWN_DATE &&
    birthDate.slice(0, 4) > deathDate.slice(0, 4)
  ) {
    errors.deathDate = "소천일이 생년월일보다 앞섭니다.";
  }

  if (Object.keys(errors).length > 0) return { value: null, errors };
  return {
    value: {
      name,
      role: optional(input.role),
      affiliation: optional(input.affiliation),
      pastor: optional(input.pastor),
      funeralChurch: optional(input.funeralChurch),
      birthDate: birthDate as string,
      deathDate: deathDate as string,
      deathAge: optional(input.deathAge),
      burialPlace: text(input.burialPlace),
      burialDate: burialDate === UNKNOWN_DATE ? null : burialDate,
    },
    errors,
  };
}

/** 바뀐 칸만 "성함: 김소망 → 김소망(바로잡음)" 처럼 적는다 (관리 기록용). */
export function describeIntermentChanges(
  before: CleanIntermentFields,
  after: CleanIntermentFields
) {
  return (Object.keys(INTERMENT_FIELD_LABELS) as (keyof CleanIntermentFields)[])
    .filter(key => (before[key] ?? "") !== (after[key] ?? ""))
    .map(
      key =>
        `${INTERMENT_FIELD_LABELS[key]}: ${before[key] || "(없음)"} → ${
          after[key] || "(없음)"
        }`
    );
}
