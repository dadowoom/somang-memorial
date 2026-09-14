import type { KioskKeyboardEditResult } from "./kioskKeyboardInput";

type KeyboardElement = Pick<
  HTMLInputElement | HTMLTextAreaElement,
  "isConnected" | "disabled" | "readOnly" | "value" | "setSelectionRange"
>;

/** Commit value and caret together, without a delayed focus callback that can
 * target the previous field after closing or switching the keyboard. */
export function commitKioskKeyboardEdit(
  element: KeyboardElement | null,
  result: KioskKeyboardEditResult,
  setValue: (value: string) => void
): boolean {
  if (!element?.isConnected || element.disabled || element.readOnly)
    return false;

  element.value = result.value;
  element.setSelectionRange(result.cursor, result.cursor);
  setValue(result.value);
  return true;
}
