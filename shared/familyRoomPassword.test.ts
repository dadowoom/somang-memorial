import { describe, expect, it } from "vitest";
import {
  FAMILY_ROOM_PASSWORD_MAX,
  FAMILY_ROOM_PASSWORD_MIN,
  familyRoomPasswordDigits,
  familyRoomPasswordProblem,
} from "./familyRoomPassword";

describe("familyRoomPasswordDigits", () => {
  it("숫자만 남긴다", () => {
    expect(familyRoomPasswordDigits("12a3-4 5six6")).toBe("123456");
    expect(familyRoomPasswordDigits("비밀번호")).toBe("");
  });

  it("최대 자릿수에서 자른다", () => {
    expect(familyRoomPasswordDigits("1234567890123456")).toHaveLength(
      FAMILY_ROOM_PASSWORD_MAX
    );
    expect(familyRoomPasswordDigits("1234567890", 100)).toBe("1234567890");
  });

  it("전각 숫자는 받지 않는다", () => {
    expect(familyRoomPasswordDigits("１２３")).toBe("");
  });
});

describe("familyRoomPasswordProblem", () => {
  it("숫자 4~6자리는 통과한다", () => {
    expect(familyRoomPasswordProblem("4829")).toBeNull();
    expect(familyRoomPasswordProblem("48291")).toBeNull();
    expect(familyRoomPasswordProblem("482915")).toBeNull();
    expect(familyRoomPasswordProblem(" 482915 ")).toBeNull();
  });

  it("글자가 섞이면 숫자만 쓰라고 알린다", () => {
    expect(familyRoomPasswordProblem("somang2026")).toMatch(/숫자만/);
    expect(familyRoomPasswordProblem("4829 15")).toMatch(/숫자만/);
  });

  it("짧거나 길면 자릿수를 알린다", () => {
    expect(FAMILY_ROOM_PASSWORD_MIN).toBe(4);
    expect(FAMILY_ROOM_PASSWORD_MAX).toBe(6);
    expect(familyRoomPasswordProblem("123")).toMatch(/숫자 4자리 이상/);
    expect(familyRoomPasswordProblem("")).toMatch(/숫자 4자리 이상/);
    expect(familyRoomPasswordProblem("1234567")).toMatch(/6자리까지/);
  });
});
