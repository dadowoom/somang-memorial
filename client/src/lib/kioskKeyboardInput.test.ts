import { describe, expect, it } from "vitest";
import {
  backspaceKioskKeyboardValue,
  insertKioskKeyboardToken,
  type KioskKeyboardEditResult,
} from "./kioskKeyboardInput";

function enterTokens(
  tokens: string,
  maxLength?: number
): KioskKeyboardEditResult {
  let result: KioskKeyboardEditResult = { value: "", cursor: 0 };

  for (const token of Array.from(tokens)) {
    result = insertKioskKeyboardToken(
      result.value,
      result.cursor,
      result.cursor,
      token,
      maxLength
    );
  }

  return result;
}

describe("insertKioskKeyboardToken", () => {
  it.each([
    ["ㄱㅣㅁㅇㅕㅇㅅㅜ", "김영수"],
    ["ㅎㅏㄴㄱㅡㄹ", "한글"],
    ["ㅇㅏㄱㄱㅣ", "악기"],
    ["ㅇㅏㄲㅣ", "아끼"],
    ["ㄷㅏㄹㄱㄱㅗㄱㅣ", "닭고기"],
    ["ㄱㅏㅂㅅㅇㅣ", "값이"],
  ])("assembles %s as %s", (tokens, expected) => {
    expect(enterTokens(tokens)).toEqual({
      value: expected,
      cursor: expected.length,
    });
  });

  it.each([
    ["ㄱㅗㅏ", "과"],
    ["ㄱㅗㅐ", "괘"],
    ["ㄱㅜㅓ", "궈"],
    ["ㄱㅜㅔ", "궤"],
    ["ㄱㅜㅣ", "귀"],
    ["ㄱㅡㅣ", "긔"],
  ])("assembles the compound vowel in %s as %s", (tokens, expected) => {
    expect(enterTokens(tokens).value).toBe(expected);
  });

  it("replaces a selection and preserves its suffix", () => {
    const first = insertKioskKeyboardToken("김영수", 1, 2, "ㅎ");
    const second = insertKioskKeyboardToken(
      first.value,
      first.cursor,
      first.cursor,
      "ㅏ"
    );
    const third = insertKioskKeyboardToken(
      second.value,
      second.cursor,
      second.cursor,
      "ㄴ"
    );

    expect(third).toEqual({ value: "김한수", cursor: 2 });
  });

  it("checks maxLength against the assembled display value", () => {
    const giyeok = insertKioskKeyboardToken("", 0, 0, "ㄱ", 1);
    const ga = insertKioskKeyboardToken("ㄱ", 1, 1, "ㅏ", 1);
    const gan = insertKioskKeyboardToken("가", 1, 1, "ㄴ", 1);
    const rejected = insertKioskKeyboardToken("간", 1, 1, "ㅏ", 1);

    expect(giyeok.value).toBe("ㄱ");
    expect(ga.value).toBe("가");
    expect(gan.value).toBe("간");
    expect(rejected).toEqual({ value: "간", cursor: 1 });
  });

  it("preserves English, numbers, punctuation, and emoji", () => {
    const result = enterTokens("Ab3!?😀");

    expect(result).toEqual({ value: "Ab3!?😀", cursor: 7 });
  });

  it("does not split an emoji when replacing a selection", () => {
    expect(insertKioskKeyboardToken("가😀나", 1, 3, "ㄱ")).toEqual({
      value: "각나",
      cursor: 1,
    });
  });
});

describe("backspaceKioskKeyboardValue", () => {
  it.each([
    ["값", "갑"],
    ["관", "과"],
    ["닭", "달"],
    ["까", "ㄲ"],
    ["가 ", "가"],
  ])("removes one input token from %s", (value, expected) => {
    expect(
      backspaceKioskKeyboardValue(value, value.length, value.length)
    ).toEqual({
      value: expected,
      cursor: expected.length,
    });
  });

  it("removes a selection without changing the surrounding text", () => {
    expect(backspaceKioskKeyboardValue("김영수", 1, 2)).toEqual({
      value: "김수",
      cursor: 1,
    });
  });

  it("removes a supplementary Unicode character as one token", () => {
    expect(backspaceKioskKeyboardValue("가😀", 3, 3)).toEqual({
      value: "가",
      cursor: 1,
    });
  });

  it("keeps the suffix when backspacing in the middle", () => {
    expect(backspaceKioskKeyboardValue("값이", 1, 1)).toEqual({
      value: "갑이",
      cursor: 1,
    });
  });

  it("is a no-op at the beginning", () => {
    expect(backspaceKioskKeyboardValue("한글", 0, 0)).toEqual({
      value: "한글",
      cursor: 0,
    });
  });
});
