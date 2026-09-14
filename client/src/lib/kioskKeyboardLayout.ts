type KeyboardOcclusion = {
  inputTop: number;
  inputBottom: number;
  keyboardTop: number;
  formBottom?: number;
};

// Keep the active input visible, and reveal its form's message/submit button
// when there is room without scrolling the input above the visible screen.
export function getKioskKeyboardScrollOffset({
  inputTop,
  inputBottom,
  keyboardTop,
  formBottom = inputBottom,
}: KeyboardOcclusion) {
  const gap = 20;
  const inputOffset = Math.max(0, inputBottom - (keyboardTop - gap));
  const formOffset = Math.max(0, formBottom - (keyboardTop - gap));
  const roomAboveInput = Math.max(0, inputTop - gap);
  return Math.max(inputOffset, Math.min(formOffset, roomAboveInput));
}
