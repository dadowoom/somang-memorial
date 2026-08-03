import { assemble, disassemble } from "es-hangul";

export type KioskKeyboardEditResult = {
  value: string;
  cursor: number;
};

type NormalizedSelection = {
  start: number;
  end: number;
};

function clampIndex(value: string, index: number): number {
  if (!Number.isFinite(index)) return value.length;
  return Math.min(value.length, Math.max(0, Math.trunc(index)));
}

function splitsSurrogatePair(value: string, index: number): boolean {
  if (index <= 0 || index >= value.length) return false;

  const previous = value.charCodeAt(index - 1);
  const next = value.charCodeAt(index);

  return (
    previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff
  );
}

function normalizeSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number
): NormalizedSelection {
  let start = clampIndex(value, Math.min(selectionStart, selectionEnd));
  let end = clampIndex(value, Math.max(selectionStart, selectionEnd));

  if (start === end && splitsSurrogatePair(value, start)) {
    start += 1;
    end += 1;
    return { start, end };
  }

  if (splitsSurrogatePair(value, start)) start -= 1;
  if (splitsSurrogatePair(value, end)) end += 1;

  return { start, end };
}

/**
 * Inserts one on-screen-keyboard token at the current selection.
 *
 * The text before the cursor is disassembled and assembled again so a newly
 * entered Korean consonant or vowel can continue the preceding syllable. The
 * returned cursor uses the same UTF-16 index convention as input.selectionStart.
 */
export function insertKioskKeyboardToken(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  token: string,
  maxLength?: number
): KioskKeyboardEditResult {
  const selection = normalizeSelection(value, selectionStart, selectionEnd);
  const prefix = value.slice(0, selection.start);
  const suffix = value.slice(selection.end);
  const nextPrefix = assemble([...Array.from(disassemble(prefix)), token]);
  const nextValue = nextPrefix + suffix;

  if (
    maxLength !== undefined &&
    Number.isFinite(maxLength) &&
    nextValue.length > Math.max(0, Math.trunc(maxLength))
  ) {
    return { value, cursor: selection.start };
  }

  return { value: nextValue, cursor: nextPrefix.length };
}

/**
 * Deletes the selection, or one disassembled input token immediately before
 * the cursor. Array.from keeps a supplementary Unicode character (for example,
 * an emoji) intact instead of deleting only half of its surrogate pair.
 */
export function backspaceKioskKeyboardValue(
  value: string,
  selectionStart: number,
  selectionEnd: number
): KioskKeyboardEditResult {
  const selection = normalizeSelection(value, selectionStart, selectionEnd);

  if (selection.start !== selection.end) {
    return {
      value: value.slice(0, selection.start) + value.slice(selection.end),
      cursor: selection.start,
    };
  }

  if (selection.start === 0) {
    return { value, cursor: 0 };
  }

  const prefixTokens = Array.from(disassemble(value.slice(0, selection.start)));
  prefixTokens.pop();

  const nextPrefix = assemble(prefixTokens);
  return {
    value: nextPrefix + value.slice(selection.end),
    cursor: nextPrefix.length,
  };
}
