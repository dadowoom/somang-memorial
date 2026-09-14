import { describe, expect, it } from "vitest";
import { getKioskKeyboardScrollOffset } from "./kioskKeyboardLayout";

describe("getKioskKeyboardScrollOffset", () => {
  it("does not scroll when the input and form are already above the keyboard", () => {
    expect(
      getKioskKeyboardScrollOffset({
        inputTop: 200,
        inputBottom: 264,
        keyboardTop: 960,
        formBottom: 400,
      })
    ).toBe(0);
  });

  it("reveals an input covered by a keyboard starting at the portrait midpoint", () => {
    const offset = getKioskKeyboardScrollOffset({
      inputTop: 900,
      inputBottom: 980,
      keyboardTop: 960,
    });

    expect(offset).toBe(40);
    expect(980 - offset).toBe(940);
  });

  it("also reveals the form's message and submit button when there is room", () => {
    const offset = getKioskKeyboardScrollOffset({
      inputTop: 600,
      inputBottom: 680,
      keyboardTop: 960,
      formBottom: 1080,
    });

    expect(offset).toBe(140);
    expect(1080 - offset).toBe(940);
    expect(600 - offset).toBeGreaterThanOrEqual(20);
  });

  it("limits scrolling for a long form to preserve the input's 20px top margin", () => {
    const offset = getKioskKeyboardScrollOffset({
      inputTop: 240,
      inputBottom: 368,
      keyboardTop: 960,
      formBottom: 1500,
    });

    expect(offset).toBe(220);
    expect(240 - offset).toBe(20);
    expect(1500 - offset).toBeGreaterThan(940);
  });

  it("defaults to the input bottom when no form bottom is supplied", () => {
    const input = { inputTop: 700, inputBottom: 820, keyboardTop: 800 };

    expect(getKioskKeyboardScrollOffset(input)).toBe(40);
    expect(getKioskKeyboardScrollOffset(input)).toBe(
      getKioskKeyboardScrollOffset({ ...input, formBottom: 820 })
    );
  });

  it("keeps both the input and form visible in a small available viewport", () => {
    const offset = getKioskKeyboardScrollOffset({
      inputTop: 260,
      inputBottom: 388,
      keyboardTop: 320,
      formBottom: 490,
    });

    expect(offset).toBe(190);
    expect(260 - offset).toBe(70);
    expect(490 - offset).toBe(300);
  });

  it("never returns a negative offset for content already above the viewport", () => {
    expect(
      getKioskKeyboardScrollOffset({
        inputTop: -60,
        inputBottom: -10,
        keyboardTop: 960,
        formBottom: 200,
      })
    ).toBe(0);
  });

  it("does not move an input at the top margin just to reveal a distant form end", () => {
    expect(
      getKioskKeyboardScrollOffset({
        inputTop: 20,
        inputBottom: 84,
        keyboardTop: 320,
        formBottom: 600,
      })
    ).toBe(0);
  });

  it("scrolls only after crossing the exact 20px keyboard clearance boundary", () => {
    const input = { inputTop: 876, inputBottom: 940, keyboardTop: 960 };

    expect(getKioskKeyboardScrollOffset(input)).toBe(0);
    expect(getKioskKeyboardScrollOffset({ ...input, inputBottom: 941 })).toBe(
      1
    );
  });

  it("prioritizes the input bottom when the input itself exceeds the visible space", () => {
    const offset = getKioskKeyboardScrollOffset({
      inputTop: 20,
      inputBottom: 500,
      keyboardTop: 400,
      formBottom: 650,
    });

    expect(offset).toBe(120);
    expect(500 - offset).toBe(380);
  });
});
