import { describe, expect, it } from "vitest";
import {
  churchHiddenLetterIds,
  letterIdFromStatusNote,
  type LetterStatusLog,
} from "./letterHideSource";

const familyHide = (id: number, letterId: number): LetterStatusLog => ({
  id,
  adminUserId: null,
  afterValue: "hidden",
  note: `편지 ${letterId} · 익명 → 김소망 (kim-somang) · 가족이 변경`,
});
const adminHide = (id: number, letterId: number): LetterStatusLog => ({
  id,
  adminUserId: 1,
  afterValue: "hidden",
  note: `편지 ${letterId} · 익명 → 김소망 (kim-somang)`,
});
const familyShow = (id: number, letterId: number): LetterStatusLog => ({
  ...familyHide(id, letterId),
  afterValue: "published",
});

describe("letterIdFromStatusNote", () => {
  it("관리 기록 메모 맨 앞의 편지 번호만 읽는다", () => {
    expect(letterIdFromStatusNote("편지 32 · 익명 → 김소망")).toBe(32);
    expect(letterIdFromStatusNote("편지 3 · 편지 32 · ")).toBe(3);
    expect(letterIdFromStatusNote("추도일 알림 32 · ")).toBeNull();
    expect(letterIdFromStatusNote(null)).toBeNull();
  });
});

describe("churchHiddenLetterIds", () => {
  it("가족이 마지막으로 숨긴 편지만 가족이 되살릴 수 있다", () => {
    const locked = churchHiddenLetterIds(
      [31, 32, 33, 34],
      [
        familyHide(1, 31),
        adminHide(2, 32),
        // 가족이 숨긴 뒤 관리자가 다시 숨김 처리하면 관리자 것이다.
        familyHide(3, 33),
        adminHide(4, 33),
        // 관리자가 숨긴 뒤 가족이 되살리고 다시 숨겼으면 가족 것이다.
        adminHide(5, 34),
        familyShow(6, 34),
        familyHide(7, 34),
      ]
    );
    expect([...locked].sort()).toEqual([32, 33]);
  });

  it("기록이 없는 숨김은 관리자가 숨긴 것으로 본다", () => {
    expect([...churchHiddenLetterIds([40], [])]).toEqual([40]);
  });

  it("관리자 계정이 지워져 번호가 비어도 가족 숨김으로 오해하지 않는다", () => {
    const orphaned = { ...adminHide(9, 41), adminUserId: null };
    expect([...churchHiddenLetterIds([41], [orphaned])]).toEqual([41]);
  });

  it("관리자가 가족 화면에서 숨긴 것도 관리자 것이다", () => {
    const viaFamilyScreen: LetterStatusLog = {
      id: 10,
      adminUserId: 1,
      afterValue: "hidden",
      note: "편지 42 · 익명 → 김소망 (kim-somang) · 관리자이 변경",
    };
    expect([...churchHiddenLetterIds([42], [viaFamilyScreen])]).toEqual([42]);
  });
});
