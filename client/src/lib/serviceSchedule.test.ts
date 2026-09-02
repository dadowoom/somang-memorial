import { describe, expect, it } from "vitest";

import { buildCalendarFile, parseServiceMoment } from "./serviceSchedule";

describe("parseServiceMoment", () => {
  it("한글 날짜와 오전/오후 시각을 읽는다", () => {
    expect(parseServiceMoment("2026년 5월 22일 목요일 오전 10시")).toEqual({
      year: 2026,
      month: 5,
      day: 22,
      hour: 10,
      minute: 0,
    });
  });

  it("오후는 12를 더한다", () => {
    expect(parseServiceMoment("2026년 5월 22일 오후 2시 30분")).toEqual({
      year: 2026,
      month: 5,
      day: 22,
      hour: 14,
      minute: 30,
    });
  });

  it("오전 12시는 자정으로 읽는다", () => {
    expect(parseServiceMoment("2026-05-22 오전 12시")?.hour).toBe(0);
  });

  it("점·하이픈으로 쓴 날짜와 콜론 시각도 읽는다", () => {
    expect(parseServiceMoment("2026.05.22 14:05")).toEqual({
      year: 2026,
      month: 5,
      day: 22,
      hour: 14,
      minute: 5,
    });
  });

  it("날짜의 월·일 숫자를 시각으로 잘못 읽지 않는다", () => {
    expect(parseServiceMoment("2026년 5월 22일")).toEqual({
      year: 2026,
      month: 5,
      day: 22,
    });
  });

  it("있을 수 없는 날짜는 거른다", () => {
    expect(parseServiceMoment("2026년 2월 30일 오전 10시")).toBeNull();
    expect(parseServiceMoment("2026년 13월 1일")).toBeNull();
  });

  it("날짜가 없으면 null", () => {
    expect(parseServiceMoment("장례 절차에 따라 진행합니다")).toBeNull();
    expect(parseServiceMoment("")).toBeNull();
    expect(parseServiceMoment(null)).toBeNull();
  });
});

describe("buildCalendarFile", () => {
  it("시각이 있으면 한 시간짜리 일정으로 만든다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22, hour: 10, minute: 0 },
      title: "김소망 권사 추모예배",
      location: "소망교회 본당",
    });

    expect(ics).toContain("DTSTART:20260522T100000");
    expect(ics).toContain("DTEND:20260522T110000");
    expect(ics).toContain("SUMMARY:김소망 권사 추모예배");
    expect(ics).toContain("LOCATION:소망교회 본당");
  });

  it("시각이 없으면 하루 종일 일정으로 만든다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22 },
      title: "추모예배",
    });

    expect(ics).toContain("DTSTART;VALUE=DATE:20260522");
    expect(ics).toContain("DTEND;VALUE=DATE:20260523");
  });

  it("달을 넘기는 하루 종일 일정도 맞게 끝난다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 31 },
      title: "추모예배",
    });

    expect(ics).toContain("DTEND;VALUE=DATE:20260601");
  });

  it("23시 예배는 종료 시각이 자정을 넘지 않는다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22, hour: 23, minute: 30 },
      title: "추모예배",
    });

    expect(ics).toContain("DTEND:20260522T235900");
  });

  it("긴 줄은 75바이트 규격에 맞춰 접는다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22, hour: 10, minute: 0 },
      title: "추모예배",
      location:
        "서울특별시 강남구 압구정로36길 55 소망교회수양관 본당 지하 1층 소망홀 앞",
    });

    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }

    // 접힌 줄을 도로 이으면 원래 내용이 그대로 나와야 한다.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "LOCATION:서울특별시 강남구 압구정로36길 55 소망교회수양관 본당 지하 1층 소망홀 앞"
    );
  });

  it("UID 에는 공백이 들어가지 않는다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22 },
      title: "김소망 권사 추모예배",
    });

    const uid = ics.split("\r\n").find(line => line.startsWith("UID:"));
    expect(uid).toBeDefined();
    expect(uid).not.toContain(" ");
  });

  it("쉼표·세미콜론이 든 장소는 규격대로 피한다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22 },
      title: "추모예배",
      location: "서울시 강남구, 소망교회; 본당",
    });

    expect(ics).toContain("LOCATION:서울시 강남구\\, 소망교회\\; 본당");
  });

  it("줄바꿈은 한 줄로 접는다", () => {
    const ics = buildCalendarFile({
      moment: { year: 2026, month: 5, day: 22 },
      title: "추모예배",
      description: "첫째 줄\n둘째 줄",
    });

    expect(ics).toContain("DESCRIPTION:첫째 줄\\n둘째 줄");
    expect(ics).not.toContain("DESCRIPTION:첫째 줄\n");
  });
});
