/**
 * 누가 편지를 숨겼는지 (2026-09-25).
 *
 * 관리자(교회)가 숨긴 편지는 관리자만 다시 보이게 할 수 있다. 가족은 가족이
 * 숨긴 편지만 되살린다. 표를 바꾸지 않고, 편지 상태를 바꿀 때마다 남기는 관리
 * 기록(action "letter.status.update")으로 판단한다. 그 메모는 늘
 * "편지 <번호> · " 로 시작하고, 가족 화면에서 바꾼 것은 "· 가족이 변경" 으로 끝난다.
 */

export type LetterStatusLog = {
  id: number;
  adminUserId: number | null;
  afterValue: string | null;
  note: string | null;
};

export const LETTER_STATUS_ACTION = "letter.status.update";

const FAMILY_CHANGE_SUFFIX = "· 가족이 변경";

/** 관리 기록 메모의 머리. 기록을 남길 때와 찾을 때 같은 모양을 쓴다. */
export function letterStatusNotePrefix(letterId: number) {
  return `편지 ${letterId} · `;
}

export function letterIdFromStatusNote(note: string | null) {
  const match = /^편지 (\d+) · /.exec(note ?? "");
  return match ? Number(match[1]) : null;
}

/**
 * 숨긴 편지 가운데 가족이 되살리면 안 되는 것(관리자가 숨긴 것).
 * 마지막 기록이 "가족이 숨김" 일 때만 가족 것이다. 기록이 없는 숨김은 가족
 * 숨기기(2026-09-23) 전부터 있던 것이라 관리자가 숨긴 것으로 본다.
 */
export function churchHiddenLetterIds(
  hiddenLetterIds: number[],
  logs: LetterStatusLog[]
) {
  const latest = new Map<number, LetterStatusLog>();
  for (const log of logs) {
    const letterId = letterIdFromStatusNote(log.note);
    if (letterId === null) continue;
    const previous = latest.get(letterId);
    if (!previous || log.id > previous.id) latest.set(letterId, log);
  }

  const locked = new Set<number>();
  for (const letterId of hiddenLetterIds) {
    const log = latest.get(letterId);
    const hiddenByFamily =
      log !== undefined &&
      log.afterValue === "hidden" &&
      log.adminUserId === null &&
      (log.note ?? "").endsWith(FAMILY_CHANGE_SUFFIX);
    if (!hiddenByFamily) locked.add(letterId);
  }
  return locked;
}
