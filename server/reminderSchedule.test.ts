import { describe, expect, it } from "vitest";
import {
  isReminderDue,
  isReminderSendHour,
  parseMemorialMonthDay,
  seoulDateAfter,
} from "./reminderSchedule";

describe("추도일 알림 보내는 날·시간", () => {
  it("여러 모양의 추도일 글자를 읽는다", () => {
    expect(parseMemorialMonthDay("매년 05월 22일")).toEqual({
      month: 5,
      day: 22,
    });
    expect(parseMemorialMonthDay("5월 2일")).toEqual({ month: 5, day: 2 });
    expect(parseMemorialMonthDay("2020-05-22")).toEqual({ month: 5, day: 22 });
    expect(parseMemorialMonthDay("5/22")).toEqual({ month: 5, day: 22 });
    expect(parseMemorialMonthDay("추후 안내")).toBeNull();
    expect(parseMemorialMonthDay(null)).toBeNull();
    expect(parseMemorialMonthDay("13월 40일")).toBeNull();
  });

  it("음력 추도일은 양력으로 바꿀 수 없어 보내지 않는다", () => {
    expect(parseMemorialMonthDay("음력 5월 22일")).toBeNull();
    expect(
      isReminderDue("매년 음력 05월 22일", { year: 2027, month: 5, day: 22 })
    ).toBe(false);
  });

  it("내일이 추도일일 때만 보낸다 (서울 날짜 기준)", () => {
    // 서울 2027-05-21 10:00 = UTC 01:00
    const now = new Date("2027-05-21T01:00:00Z");
    const tomorrow = seoulDateAfter(now, 1);
    expect(tomorrow).toEqual({ year: 2027, month: 5, day: 22 });
    expect(isReminderDue("매년 05월 22일", tomorrow)).toBe(true);
    expect(isReminderDue("매년 05월 23일", tomorrow)).toBe(false);
  });

  it("서울 밤 11시(UTC 14시)에도 날짜를 서울 기준으로 센다", () => {
    const now = new Date("2027-05-21T14:30:00Z"); // 서울 23:30
    expect(seoulDateAfter(now, 1)).toEqual({ year: 2027, month: 5, day: 22 });
  });

  it("서울 9시~20시에만 보낸다", () => {
    expect(isReminderSendHour(new Date("2027-05-21T23:59:00Z"))).toBe(false); // 08:59
    expect(isReminderSendHour(new Date("2027-05-22T00:00:00Z"))).toBe(true); // 09:00
    expect(isReminderSendHour(new Date("2027-05-22T11:59:00Z"))).toBe(true); // 20:59
    expect(isReminderSendHour(new Date("2027-05-22T12:00:00Z"))).toBe(false); // 21:00
    expect(isReminderSendHour(new Date("2027-05-21T18:00:00Z"))).toBe(false); // 03:00
  });
});
