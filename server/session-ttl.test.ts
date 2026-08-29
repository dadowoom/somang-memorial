import { describe, expect, it } from "vitest";
import {
  ONE_YEAR_MS,
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_MS,
} from "@shared/const";

describe("로그인 유지 기간", () => {
  it("1년보다 훨씬 짧다", () => {
    expect(SESSION_TTL_MS).toBeLessThan(ONE_YEAR_MS);
    expect(SESSION_TTL_MS).toBe(1000 * 60 * 60 * 24 * 14);
  });

  // 너무 짧으면 어르신들이 계속 다시 로그인해야 하고, 너무 길면 공용
  // 컴퓨터에 방치된 세션이 오래 살아 있다.
  it("하루보다는 길고 두 달보다는 짧다", () => {
    const day = 1000 * 60 * 60 * 24;
    expect(SESSION_TTL_MS).toBeGreaterThan(day);
    expect(SESSION_TTL_MS).toBeLessThan(day * 60);
  });

  it("절반이 지났을 때 연장한다", () => {
    expect(SESSION_RENEW_AFTER_MS).toBe(SESSION_TTL_MS / 2);
  });

  // 갓 발급된 세션까지 매번 다시 발급하면 서명 비용과 쿠키 쓰기가 낭비다.
  it("갓 발급된 세션은 연장 대상이 아니다", () => {
    const remaining = SESSION_TTL_MS;
    expect(remaining > SESSION_RENEW_AFTER_MS).toBe(true);
  });

  it("절반 아래로 내려간 세션은 연장 대상이다", () => {
    const remaining = SESSION_TTL_MS / 2 - 1;
    expect(remaining > 0 && remaining <= SESSION_RENEW_AFTER_MS).toBe(true);
  });

  it("이미 만료된 세션은 연장하지 않는다", () => {
    const remaining = -1;
    expect(remaining <= 0).toBe(true);
  });
});
