/**
 * 가족관 비밀번호 규칙 (2026-09-16 결정: 숫자 4~6자리로만 정한다).
 *
 * 가족 여러 분이 나눠 쓰고, 휴대폰·키오스크의 숫자판으로 쉽게 누를 수 있게 한다.
 * 4자리는 경우의 수가 1만 가지라 짐작으로 맞히기 쉬운 편이다. 들어가는 화면이
 * 한 곳(접속)에서 10분에 5번까지만 틀릴 수 있게 막아 두었으니, 이 제한을 풀지 말 것.
 *
 * 들어갈 때(familyRoom.verify)는 예전에 글자나 긴 숫자로 정해 둔 비밀번호도 계속
 * 받는다. 새로 만들거나 바꿀 때만 이 규칙을 따진다.
 */
export const FAMILY_ROOM_PASSWORD_MIN = 4;
export const FAMILY_ROOM_PASSWORD_MAX = 6;

/** 입력 칸에서 숫자가 아닌 글자를 걷어 내고 최대 길이로 자른다. */
export function familyRoomPasswordDigits(
  value: string,
  maxLength = FAMILY_ROOM_PASSWORD_MAX
): string {
  return value.replace(/[^0-9]/g, "").slice(0, maxLength);
}

/** 새로 정하는 비밀번호가 규칙에 맞지 않으면 안내 문구를, 맞으면 null 을 돌려준다. */
export function familyRoomPasswordProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[0-9]*$/.test(trimmed)) {
    return "가족관 비밀번호는 숫자만 쓸 수 있습니다.";
  }
  if (trimmed.length < FAMILY_ROOM_PASSWORD_MIN) {
    return `가족관 비밀번호는 숫자 ${FAMILY_ROOM_PASSWORD_MIN}자리 이상으로 정해 주세요.`;
  }
  if (trimmed.length > FAMILY_ROOM_PASSWORD_MAX) {
    return `가족관 비밀번호는 숫자 ${FAMILY_ROOM_PASSWORD_MAX}자리까지 정할 수 있습니다.`;
  }
  return null;
}
