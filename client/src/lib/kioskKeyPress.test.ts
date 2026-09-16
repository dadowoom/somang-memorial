import { describe, expect, it } from "vitest";
import {
  shouldActivateOnClick,
  shouldActivateOnPointerDown,
} from "./kioskKeyPress";

describe("키오스크 자판 누르기", () => {
  it("글자 단추는 손가락이 닿는 순간 한 번만 들어간다", () => {
    expect(
      shouldActivateOnPointerDown(
        "press",
        { pointerType: "touch", button: 0 },
        false
      )
    ).toBe(true);
    // 뒤따라오는 click 은 버린다.
    expect(shouldActivateOnClick("press", { detail: 1 }, false)).toBe(false);
  });

  it("키보드 Enter·Space 로 누르면 click 으로 들어간다", () => {
    expect(shouldActivateOnClick("press", { detail: 0 }, false)).toBe(true);
  });

  it("마우스 오른쪽 단추와 꺼진 단추는 무시한다", () => {
    expect(
      shouldActivateOnPointerDown(
        "press",
        { pointerType: "mouse", button: 2 },
        false
      )
    ).toBe(false);
    expect(
      shouldActivateOnPointerDown(
        "press",
        { pointerType: "touch", button: 0 },
        true
      )
    ).toBe(false);
    expect(shouldActivateOnClick("press", { detail: 0 }, true)).toBe(false);
  });

  it("자판을 닫는 단추는 손을 뗄 때(click) 들어간다", () => {
    expect(
      shouldActivateOnPointerDown(
        "click",
        { pointerType: "touch", button: 0 },
        false
      )
    ).toBe(false);
    expect(shouldActivateOnClick("click", { detail: 1 }, false)).toBe(true);
  });
});
