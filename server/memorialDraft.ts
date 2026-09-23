/**
 * 추모관 작성 중 자동 저장 규칙 (2026-09-23).
 *
 * 화면이 보낸 저장본을 그대로 믿지 않는다. 이 계정의 저장본(version 2, 같은
 * 회원번호)인지 보고, 입장 비밀번호와 관리자 메모는 한 번 더 빼고 저장한다.
 * 글 내용의 자세한 검사는 불러올 때 화면(readMemorialDraft)이 한다.
 */
export const DRAFT_PAYLOAD_MAX_CHARS = 300_000;

export function sanitizeDraftPayload(
  raw: string,
  userId: number
): string | null {
  if (raw.length > DRAFT_PAYLOAD_MAX_CHARS) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const draft = parsed as Record<string, unknown>;
  if (draft.version !== 2 || draft.userId !== userId) return null;
  if (
    !draft.form ||
    typeof draft.form !== "object" ||
    Array.isArray(draft.form) ||
    !Array.isArray(draft.timeline)
  ) {
    return null;
  }
  const {
    accessPassword: _password,
    managerMemo: _memo,
    ...form
  } = draft.form as Record<string, unknown>;
  return JSON.stringify({ ...draft, form });
}
