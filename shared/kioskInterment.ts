import {
  getIntermentPersonName,
  isSearchableIntermentBirthDate,
} from "./parentFinder";

/**
 * 장지 칸을 공개 화면에 보일 말로 바꾼다 (2026-09-21).
 *
 * 교회 명단의 장지 칸에는 "소망동산(원지동 09:10)", "충남 예산군 ○○면 선영
 * 안장/홍성추모공원 08:00 화장"처럼 화장장·시각·가족 선산 주소가 섞여 있다.
 * 키오스크와 홈페이지는 누구나 보는 화면이라 원문을 그대로 내보내지 않는다.
 * 소망동산이면 "소망동산", 다른 곳이면 "다른 장지", 비어 있으면 없음.
 */
export function publicBurialPlace(place: string | null | undefined) {
  const text = (place ?? "").trim();
  if (!text) return null;
  return text.includes("소망동산") ? "소망동산" : "다른 장지";
}

/** Only the fields approved for the public kiosk leave the server. */
export function toKioskInterment(record: {
  id: number;
  name: string;
  role: string | null;
  birthDate: string;
  deathDate: string;
  burialPlace: string;
  burialDate: string | null;
  memorialSlug: string | null;
}) {
  const date = (value: string | null) =>
    value && isSearchableIntermentBirthDate(value) ? value : null;
  return {
    id: record.id,
    name: getIntermentPersonName(record.name),
    role: record.role?.trim() || null,
    birthDate: date(record.birthDate),
    deathDate: date(record.deathDate),
    burialPlace: publicBurialPlace(record.burialPlace),
    burialDate: date(record.burialDate),
    message:
      publicBurialPlace(record.burialPlace) === "소망동산"
        ? "소망교회 소망동산에 안장되어 있습니다."
        : publicBurialPlace(record.burialPlace)
          ? "소망동산이 아닌 다른 곳에 모셔졌습니다."
          : "안장 장소 미등록",
    href: record.memorialSlug ? `/kiosk/memorial/${record.memorialSlug}` : null,
  };
}

export type KioskInterment = ReturnType<typeof toKioskInterment>;
