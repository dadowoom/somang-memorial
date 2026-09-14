type KeyboardOcclusion = {
  inputTop: number;
  inputBottom: number;
  keyboardTop: number;
  formBottom?: number;
  formTop?: number;
  contextTop?: number;
  visibleTop?: number;
  preferTop?: boolean;
};

// Keep the active input visible, and reveal its form's message/submit button
// when there is room without scrolling the input above the visible screen.
export function getKioskKeyboardScrollOffset({
  inputTop,
  inputBottom,
  keyboardTop,
  formBottom = inputBottom,
  formTop,
  contextTop,
  visibleTop = 0,
  preferTop = false,
}: KeyboardOcclusion) {
  const gap = 20;
  const targetTop = visibleTop + gap;
  if (preferTop) {
    // Keep the heading and entire form when they fit, then the form alone.
    // On shorter screens the active input takes priority. Signed offsets also
    // recover a heading clipped above the viewport after a field switch.
    const candidates = [
      { top: contextTop, bottom: formBottom },
      { top: formTop, bottom: formBottom },
      { top: inputTop, bottom: inputBottom },
    ];
    for (const candidate of candidates) {
      if (candidate.top === undefined) continue;
      const height = candidate.bottom - candidate.top;
      const spareSpace = keyboardTop - visibleTop - height;
      if (height >= 0 && spareSpace >= 16) {
        // A slightly tighter margin preserves a complete form on shorter
        // kiosks instead of unnecessarily clipping its first input.
        const candidateGap = Math.min(gap, spareSpace / 2);
        return candidate.top - (visibleTop + candidateGap);
      }
    }
  }
  const inputOffset = Math.max(0, inputBottom - (keyboardTop - gap));
  const formOffset = Math.max(0, formBottom - (keyboardTop - gap));
  const roomAboveInput = Math.max(0, inputTop - targetTop);
  return Math.max(inputOffset, Math.min(formOffset, roomAboveInput));
}
