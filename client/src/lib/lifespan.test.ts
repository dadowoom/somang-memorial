import { describe, expect, it } from "vitest";

import { formatLifespan, formatPassingDate } from "./lifespan";

describe("formatLifespan", () => {
  it("둘 다 있으면 함께 보여준다", () => {
    expect(formatLifespan("1933", "2026")).toBe("1933 - 2026");
  });

  // 출생 연도만 아는 분이 드물지 않다. 그때 소천일만 정확히 적히면
  // "1930 - 2008-02-06" 처럼 잘못 적은 것처럼 읽힌다.
  it("한쪽만 연도면 양쪽을 연도로 맞춘다", () => {
    expect(formatLifespan("1930", "2008-02-06")).toBe("1930 - 2008");
    expect(formatLifespan("1933-04-02", "2026")).toBe("1933 - 2026");
    expect(formatLifespan("1930", "2008-02")).toBe("1930 - 2008");
  });

  it("양쪽 다 온전한 날짜면 그대로 둔다", () => {
    expect(formatLifespan("1933-05-22", "2019-11-03")).toBe(
      "1933-05-22 - 2019-11-03"
    );
  });

  it("연도로 시작하지 않는 값은 건드리지 않는다", () => {
    expect(formatLifespan("미상", "2026")).toBe("미상 - 2026");
  });

  it("소천 전에 준비한 추모관은 꼬리를 남기지 않는다", () => {
    expect(formatLifespan("1933-04-02", "")).toBe("1933-04-02");
    expect(formatLifespan("1933-04-02", null)).toBe("1933-04-02");
  });

  it("둘 다 없으면 빈 글자", () => {
    expect(formatLifespan("", "")).toBe("");
    expect(formatLifespan(null, null)).toBe("");
  });
});

describe("formatPassingDate", () => {
  it("온전한 날짜는 한글 날짜로 바꾼다", () => {
    expect(formatPassingDate("2026-05-20")).toBe("2026년 5월 20일");
    expect(formatPassingDate("2026.05.20")).toBe("2026년 5월 20일");
    expect(formatPassingDate("2026/5/2")).toBe("2026년 5월 2일");
  });

  it("연도만 있으면 조사를 붙인다", () => {
    // "2026 소천하셨기에" 가 되지 않게 한다.
    expect(formatPassingDate("2026")).toBe("2026년에");
  });

  it("연월까지만 있어도 조사를 붙인다", () => {
    expect(formatPassingDate("2026-05")).toBe("2026년 5월에");
  });

  it("알 수 없는 형식은 그대로 둔다", () => {
    expect(formatPassingDate("추후 안내")).toBe("추후 안내");
    expect(formatPassingDate("")).toBe("");
    expect(formatPassingDate(null)).toBe("");
  });
});
