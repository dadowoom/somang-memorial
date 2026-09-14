import { describe, expect, it, vi } from "vitest";
import { commitKioskKeyboardEdit } from "./kioskKeyboardCommit";
import {
  backspaceKioskKeyboardValue,
  insertKioskKeyboardToken,
} from "./kioskKeyboardInput";

function input(value = "", cursor = value.length) {
  return {
    isConnected: true,
    disabled: false,
    readOnly: false,
    value,
    selectionStart: cursor,
    selectionEnd: cursor,
    setSelectionRange(start: number, end: number) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
  };
}

describe("commitKioskKeyboardEdit", () => {
  it("publishes the DOM value and caret before the change callback", () => {
    const element = input();
    const changed = vi.fn(value => {
      expect(value).toBe("김");
      expect(element.value).toBe("김");
      expect(element.selectionStart).toBe(1);
      expect(element.selectionEnd).toBe(1);
    });
    expect(
      commitKioskKeyboardEdit(element, { value: "김", cursor: 1 }, changed)
    ).toBe(true);
    expect(changed).toHaveBeenCalledOnce();
  });

  it.each([
    ["ㄱㅣㅁㅅㅗㅁㅏㅇ", "김소망"],
    ["ㄷㅏㄹㄱㄱㅗㄱㅣ", "닭고기"],
    ["Ab3!?😀", "Ab3!?😀"],
  ])("keeps every token in a synchronous burst: %s", (tokens, expected) => {
    const element = input();
    let latestValue = "";
    for (const token of Array.from(tokens)) {
      commitKioskKeyboardEdit(
        element,
        insertKioskKeyboardToken(
          latestValue,
          element.selectionStart,
          element.selectionEnd,
          token
        ),
        value => {
          latestValue = value;
        }
      );
    }
    expect(latestValue).toBe(expected);
    expect(element.value).toBe(expected);
    expect(element.selectionStart).toBe(expected.length);
  });

  it("preserves the suffix during rapid selected replacement and deletion", () => {
    const element = input("김소망", 1);
    element.selectionEnd = 2;
    const commit = (result: ReturnType<typeof insertKioskKeyboardToken>) =>
      commitKioskKeyboardEdit(element, result, () => {});
    for (const token of ["ㅎ", "ㅏ", "ㄴ"]) {
      commit(
        insertKioskKeyboardToken(
          element.value,
          element.selectionStart,
          element.selectionEnd,
          token
        )
      );
    }
    expect(element.value).toBe("김한망");
    for (let i = 0; i < 3; i++) {
      commit(
        backspaceKioskKeyboardValue(
          element.value,
          element.selectionStart,
          element.selectionEnd
        )
      );
    }
    expect(element.value).toBe("김망");
    expect(element.selectionStart).toBe(1);
  });

  it.each(["isConnected", "disabled", "readOnly"] as const)(
    "does not edit an unavailable field: %s",
    property => {
      const element = input("원래");
      element[property] = property !== "isConnected";
      const changed = vi.fn();
      expect(
        commitKioskKeyboardEdit(element, { value: "변경", cursor: 2 }, changed)
      ).toBe(false);
      expect(element.value).toBe("원래");
      expect(changed).not.toHaveBeenCalled();
    }
  );

  it("ignores a removed field", () => {
    const changed = vi.fn();
    expect(
      commitKioskKeyboardEdit(null, { value: "변경", cursor: 2 }, changed)
    ).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });
});
