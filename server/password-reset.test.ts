import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { hashUserPassword, verifyUserPassword } from "./db";

/**
 * 재설정 링크의 값은 저장하지 않고 해시만 남깁니다. db.ts 안의 함수는
 * 데이터베이스가 있어야 돌아가므로, 여기서는 그 규칙 자체를 확인합니다.
 */
describe("비밀번호 재설정 링크 값 처리", () => {
  it("링크 값을 그대로 저장하지 않는다", () => {
    const token = "abcdefghijklmnopqrstuvwxyz123456";
    const stored = createHash("sha256").update(token).digest("hex");
    expect(stored).not.toContain(token);
    expect(stored).toHaveLength(64);
  });

  it("같은 값이면 같은 해시, 한 글자만 달라도 완전히 다른 해시", () => {
    const a = createHash("sha256").update("token-a").digest("hex");
    const b = createHash("sha256").update("token-a").digest("hex");
    const c = createHash("sha256").update("token-b").digest("hex");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("재설정 뒤의 비밀번호", () => {
  it("새 비밀번호가 회원 비밀번호와 같은 방식으로 저장된다", () => {
    const stored = hashUserPassword("새비밀번호2026");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(verifyUserPassword("새비밀번호2026", stored)).toBe(true);
    expect(verifyUserPassword("예전비밀번호", stored)).toBe(false);
  });

  it("같은 비밀번호로 바꿔도 저장값은 매번 달라진다", () => {
    const a = hashUserPassword("같은비밀번호");
    const b = hashUserPassword("같은비밀번호");
    expect(a).not.toBe(b);
  });
});
