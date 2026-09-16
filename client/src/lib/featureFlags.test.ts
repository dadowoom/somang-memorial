import { describe, expect, it } from "vitest";
import { MEMORIAL_REMINDER_SIGNUP_ENABLED } from "./featureFlags";

describe("기능 스위치", () => {
  it("문자 발신번호 등록 전에는 추도일 알림 신청 칸을 숨긴다", () => {
    expect(MEMORIAL_REMINDER_SIGNUP_ENABLED).toBe(false);
  });
});
