/**
 * 출생일과 소천일을 함께 보여줍니다.
 *
 * 소천 전에 미리 추모관을 준비하는 경우가 있어 소천일은 비어 있을 수 있습니다.
 * 그때 "1960-11-10 - " 처럼 꼬리가 남지 않도록 합니다.
 */
export function formatLifespan(
  birthDate?: string | null,
  deathDate?: string | null
) {
  const birth = (birthDate ?? "").trim();
  const death = (deathDate ?? "").trim();

  if (birth && death) return `${birth} - ${death}`;
  return birth || death || "";
}
