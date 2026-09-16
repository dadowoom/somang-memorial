/**
 * 비밀번호 입장 화면(웹·키오스크)에 넘기는 추모관 상태.
 *
 * 2026-09-14 결정: 비공개 추모관은 주소만 알아도 성함·생년월일·소천일·요약을
 * 볼 수 있으면 안 된다. 키오스크 검색이 비공개 추모관을 이름부터 숨기는 것과
 * 같은 기준이다. 그래서 비공개면 "비공개 추모관이고 비밀번호가 필요하다"는
 * 사실만 돌려주고, 인적 사항은 비밀번호를 맞힌 뒤 본문에서 본다.
 */
export type MemorialAccessStatusRow = {
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  summary: string;
  visibility: string;
  accessPasswordHash: string | null;
  /** 없으면 등록 완료(published)로 본다. */
  status?: string;
};

export type MemorialAccessStatus = {
  slug: string;
  name: string | null;
  role: string | null;
  birthDate: string | null;
  deathDate: string | null;
  church: string | null;
  summary: string | null;
  visibility: string;
  isPrivate: boolean;
  requiresPassword: boolean;
  /**
   * 작성 중(등록 완료 전)이면 true (2026-09-16). 입장 화면은 비밀번호 칸 대신
   * "가족이 등록을 마치면 볼 수 있다"고 안내한다. 인적 사항도 내주지 않는다.
   */
  isPreparing: boolean;
  href: string;
};

export function isPrivateMemorialVisibility(visibility: string) {
  return visibility === "private";
}

/** 비공개 추모관이면 이름을 감춘다. 입장 화면에서 이름 대신 안내문을 쓴다. */
export function publicMemorialName(visibility: string, name: string) {
  return isPrivateMemorialVisibility(visibility) ? null : name;
}

export function toMemorialAccessStatus(
  row: MemorialAccessStatusRow
): MemorialAccessStatus {
  const isPrivate = isPrivateMemorialVisibility(row.visibility);
  const isPreparing = row.status === "pending";
  const base = {
    slug: row.slug,
    visibility: row.visibility,
    isPrivate,
    requiresPassword:
      !isPreparing && isPrivate && Boolean(row.accessPasswordHash),
    isPreparing,
    href: `/memorial/${row.slug}`,
  };

  if (isPrivate || isPreparing) {
    return {
      ...base,
      name: null,
      role: null,
      birthDate: null,
      deathDate: null,
      church: null,
      summary: null,
    };
  }

  return {
    ...base,
    name: row.name,
    role: row.role,
    birthDate: row.birthDate,
    deathDate: row.deathDate,
    church: row.church,
    summary: row.summary,
  };
}
