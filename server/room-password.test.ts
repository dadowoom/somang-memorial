import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import {
  createMemorialAccessToken,
  hashFamilyRoomPassword,
  hashMemorialAccessPassword,
  isLegacyRoomSecret,
  verifyFamilyRoomPassword,
  verifyMemorialAccessPasswordHash,
} from "./db";

describe("입장 비밀번호 저장", () => {
  it("소금을 넣은 scrypt 형식으로 저장한다", () => {
    const stored = hashMemorialAccessPassword("우리가족2026");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(stored.split(":")).toHaveLength(3);
  });

  // 같은 비밀번호가 같은 값으로 저장되면, 데이터베이스만 봐도 어느 추모관들이
  // 같은 비밀번호를 쓰는지 드러난다.
  it("같은 비밀번호라도 매번 다른 값으로 저장된다", () => {
    const a = hashMemorialAccessPassword("같은비밀번호");
    const b = hashMemorialAccessPassword("같은비밀번호");
    expect(a).not.toBe(b);
    expect(verifyMemorialAccessPasswordHash("같은비밀번호", a)).toBe(true);
    expect(verifyMemorialAccessPasswordHash("같은비밀번호", b)).toBe(true);
  });

  it("맞는 비밀번호는 통과하고 틀린 비밀번호는 막는다", () => {
    const stored = hashMemorialAccessPassword("바른비밀번호");
    expect(verifyMemorialAccessPasswordHash("바른비밀번호", stored)).toBe(true);
    expect(verifyMemorialAccessPasswordHash("틀린비밀번호", stored)).toBe(
      false
    );
    expect(verifyMemorialAccessPasswordHash("", stored)).toBe(false);
  });

  // 예전에 저장된 값으로 아무도 잠기면 안 된다.
  it("예전 방식으로 저장된 값도 그대로 받아준다", () => {
    const legacy = createHash("sha256")
      .update("somang-memorial-access:1234")
      .digest("hex");
    expect(isLegacyRoomSecret(legacy)).toBe(true);
    expect(verifyMemorialAccessPasswordHash("1234", legacy)).toBe(true);
    expect(verifyMemorialAccessPasswordHash("9999", legacy)).toBe(false);
  });

  it("새 형식은 옛 형식으로 오해하지 않는다", () => {
    expect(isLegacyRoomSecret(hashMemorialAccessPassword("아무거나"))).toBe(
      false
    );
  });

  it("망가진 값에는 통과를 내주지 않는다", () => {
    for (const broken of ["", "scrypt:", "scrypt:소금만", "아무말"]) {
      expect(verifyMemorialAccessPasswordHash("1234", broken)).toBe(false);
    }
  });
});

describe("가족관 비밀번호", () => {
  it("소금을 넣은 scrypt 형식으로 저장한다", () => {
    const stored = hashFamilyRoomPassword("가족방2026");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(verifyFamilyRoomPassword("가족방2026", stored)).toBe(true);
    expect(verifyFamilyRoomPassword("다른비밀번호", stored)).toBe(false);
  });

  it("예전 방식으로 저장된 값도 그대로 받아준다", () => {
    const legacy = createHash("sha256")
      .update("somang-family:1234")
      .digest("hex");
    expect(verifyFamilyRoomPassword("1234", legacy)).toBe(true);
  });

  // 가족관과 추모관은 쓰임이 다르므로 서로 통하면 안 된다.
  it("가족관 비밀번호로 추모관에 들어갈 수 없다", () => {
    const familyStored = hashFamilyRoomPassword("같은비밀번호");
    expect(verifyMemorialAccessPasswordHash("같은비밀번호", familyStored)).toBe(
      false
    );
  });
});

describe("입장 열쇠", () => {
  // 저장 방식이 소금을 쓰게 되면서, 같은 비밀번호를 쓰는 추모관끼리도
  // 열쇠가 달라진다.
  it("같은 비밀번호를 쓴 다른 추모관과 열쇠가 겹치지 않는다", () => {
    const first = hashMemorialAccessPassword("같은비밀번호");
    const second = hashMemorialAccessPassword("같은비밀번호");
    expect(createMemorialAccessToken("kim-somang", first)).not.toBe(
      createMemorialAccessToken("park-somang", second)
    );
  });

  it("같은 추모관·같은 저장값이면 열쇠가 같다", () => {
    const stored = hashMemorialAccessPassword("우리가족2026");
    expect(createMemorialAccessToken("kim-somang", stored)).toBe(
      createMemorialAccessToken("kim-somang", stored)
    );
  });
});

describe("저장 칸 크기", () => {
  // 예전 칸은 64자짜리 옛 형식에 맞춘 128자였다. 새 형식은 168자라
  // 넓히지 않으면 입장할 때 저장에 실패한다. 실제로 겪은 문제다.
  it("새 형식이 168자를 넘지 않는다", () => {
    const stored = hashMemorialAccessPassword("아주아주긴비밀번호를넣어본다");
    expect(stored.length).toBe(168);
    expect(stored.length).toBeLessThanOrEqual(255);
  });
});
