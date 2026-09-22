import { describe, expect, it } from "vitest";
import {
  generateVerifyCode,
  hashReminderPhone,
  hashVerifyCode,
  judgeVerification,
  VERIFY_MAX_ATTEMPTS,
  verifyFailureMessage,
} from "./reminderVerification";

// 가짜 비밀값·가짜 번호. 실제 값이 아니다.
const SECRET = "test-secret-0123456789-0123456789";
const PHONE = "010-0000-0000";

describe("추도일 알림 본인 번호 확인", () => {
  it("인증번호는 숫자 6자리다", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateVerifyCode()).toMatch(/^\d{6}$/);
    }
  });

  it("번호는 모양이 달라도 같은 해시가 되고, 원래 번호는 드러나지 않는다", () => {
    const a = hashReminderPhone(PHONE, SECRET);
    expect(hashReminderPhone("01000000000", SECRET)).toBe(a);
    expect(a).not.toContain("0000");
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(() => hashReminderPhone(PHONE, "")).toThrow();
  });

  const phoneHash = hashReminderPhone(PHONE, SECRET);
  const record = (changes = {}) => ({
    codeHash: hashVerifyCode(phoneHash, "123456", SECRET),
    attempts: 0,
    expiresAt: new Date("2026-09-23T10:05:00Z"),
    usedAt: null,
    ...changes,
  });
  const now = new Date("2026-09-23T10:01:00Z");
  const codeHash = (code: string) => hashVerifyCode(phoneHash, code, SECRET);

  it("맞는 번호는 통과한다", () => {
    expect(judgeVerification(record(), codeHash("123456"), now)).toBe("ok");
  });

  it("틀린 번호, 다른 전화번호로 받은 번호는 통과하지 못한다", () => {
    expect(judgeVerification(record(), codeHash("654321"), now)).toBe("wrong");
    const otherPhone = hashReminderPhone("010-1111-1111", SECRET);
    expect(
      judgeVerification(
        record(),
        hashVerifyCode(otherPhone, "123456", SECRET),
        now
      )
    ).toBe("wrong");
  });

  it("5분이 지났거나, 이미 썼거나, 5번 틀렸으면 막는다", () => {
    const later = new Date("2026-09-23T10:06:00Z");
    expect(judgeVerification(record(), codeHash("123456"), later)).toBe(
      "expired"
    );
    expect(
      judgeVerification(record({ usedAt: now }), codeHash("123456"), now)
    ).toBe("missing");
    expect(
      judgeVerification(
        record({ attempts: VERIFY_MAX_ATTEMPTS }),
        codeHash("123456"),
        now
      )
    ).toBe("locked");
    expect(judgeVerification(null, codeHash("123456"), now)).toBe("missing");
  });

  it("안내 문구는 다음에 할 일을 알려 준다", () => {
    expect(verifyFailureMessage("wrong", 3)).toContain("3번 더");
    expect(verifyFailureMessage("wrong", 0)).toContain("다시 받아");
    expect(verifyFailureMessage("expired")).toContain("5분");
    expect(verifyFailureMessage("missing")).toContain("먼저 받아");
  });
});
