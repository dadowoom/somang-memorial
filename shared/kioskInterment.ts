import {
  getIntermentPersonName,
  isSearchableIntermentBirthDate,
} from "./parentFinder";

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
    burialPlace: record.burialPlace.trim() || null,
    burialDate: date(record.burialDate),
    message: record.burialPlace.trim()
      ? record.burialPlace.includes("소망동산")
        ? "소망교회 소망동산에 안장되어 있습니다."
        : `등록된 안장 장소: ${record.burialPlace.trim()}`
      : "안장 장소 미등록",
    href: record.memorialSlug ? `/kiosk/memorial/${record.memorialSlug}` : null,
  };
}

export type KioskInterment = ReturnType<typeof toKioskInterment>;
