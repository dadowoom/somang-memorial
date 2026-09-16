import { describe, expect, it } from "vitest";
import { formatPhoneWhileTyping, normalizeKoreanPhone } from "./kioskInquiry";

describe("normalizeKoreanPhone", () => {
  it("휴대전화·서울·지역번호를 하이픈 꼴로 정리한다", () => {
    expect(normalizeKoreanPhone("01012345678")).toBe("010-1234-5678");
    expect(normalizeKoreanPhone("010 1234 5678")).toBe("010-1234-5678");
    expect(normalizeKoreanPhone("011-234-5678")).toBe("011-234-5678");
    expect(normalizeKoreanPhone("0212345678")).toBe("02-1234-5678");
    expect(normalizeKoreanPhone("021234567")).toBe("02-123-4567");
    expect(normalizeKoreanPhone("0317646052")).toBe("031-764-6052");
  });

  it("전화번호로 볼 수 없으면 null", () => {
    expect(normalizeKoreanPhone("")).toBeNull();
    expect(normalizeKoreanPhone("1234")).toBeNull();
    expect(normalizeKoreanPhone("12345678901")).toBeNull();
    expect(normalizeKoreanPhone("010123")).toBeNull();
    expect(normalizeKoreanPhone("abcdefghijk")).toBeNull();
  });
});

describe("formatPhoneWhileTyping", () => {
  it("치는 중에도 보기 좋게 끊어 준다", () => {
    expect(formatPhoneWhileTyping("010")).toBe("010");
    expect(formatPhoneWhileTyping("0101234")).toBe("010-1234");
    expect(formatPhoneWhileTyping("01012345678")).toBe("010-1234-5678");
    expect(formatPhoneWhileTyping("021234")).toBe("02-1234");
    expect(formatPhoneWhileTyping("0212345678")).toBe("02-1234-5678");
    // 11자리 넘으면 잘라 낸다
    expect(formatPhoneWhileTyping("010123456789")).toBe("010-1234-5678");
  });
});
