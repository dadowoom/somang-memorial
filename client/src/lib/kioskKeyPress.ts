/**
 * 키오스크 화면 자판의 "눌렀다"를 언제로 볼지 (2026-09-16 현장 보고: 숫자 자판이
 * 잘 안 눌리는 느낌).
 *
 * 전에는 손가락을 뗄 때 생기는 click 으로 글자를 넣었다. 그런데 누르는 동안
 * 손가락이 조금만 움직이거나, 눌린 단추가 2px 내려가며 손가락이 단추 가장자리
 * 밖으로 나가면 브라우저가 click 을 만들지 않아 글자가 안 들어갔다.
 * 이제 글자·지우기·자판 바꾸기는 손가락이 닿는 순간(pointerdown) 넣는다.
 *
 * 자판을 닫는 단추(완료·검색·편지 남기기 등)는 그대로 click 에 둔다. 닿는 순간
 * 자판이 사라지면, 손가락을 뗄 때 그 아래에 있던 화면이 대신 눌릴 수 있다.
 */
export type KioskKeyActivation = "press" | "click";

export function shouldActivateOnPointerDown(
  activation: KioskKeyActivation,
  event: { pointerType: string; button: number },
  disabled: boolean
) {
  if (activation !== "press" || disabled) return false;
  // 마우스는 왼쪽 단추만. 손가락·펜은 button 이 0 이다.
  return event.button === 0;
}

/**
 * click 으로 처리할지. 누르는 순간 처리한 단추는 뒤따라오는 click(detail 1 이상)을
 * 버린다. 키보드 Enter·Space 로 누른 click 은 detail 이 0 이라 그대로 처리한다.
 */
export function shouldActivateOnClick(
  activation: KioskKeyActivation,
  event: { detail: number },
  disabled: boolean
) {
  if (disabled) return false;
  if (activation === "click") return true;
  return event.detail === 0;
}
