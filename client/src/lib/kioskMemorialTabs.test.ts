import { describe, expect, it } from "vitest";
import { formatPassingDate, kioskMemorialTabs } from "./kioskMemorialTabs";

describe("kioskMemorialTabs", () => {
  it("홈페이지 추모관 탭과 같은 이름·순서다", () => {
    expect(
      kioskMemorialTabs({ deathDate: "2026-03-01" }).map(t => t.label)
    ).toEqual(["삶과 신앙", "사진과 기록", "편지 남기기", "가족관", "부고장"]);
  });

  it("작성 중인 추모관에는 편지 남기기 탭이 없다", () => {
    expect(
      kioskMemorialTabs({ deathDate: "2026-03-01", status: "pending" }).map(
        t => t.id
      )
    ).toEqual(["life", "records", "family", "obituary"]);
  });

  it("소천일이 없으면 부고장 탭이 없다", () => {
    expect(kioskMemorialTabs({ deathDate: "" }).map(t => t.id)).toEqual([
      "life",
      "records",
      "letters",
      "family",
    ]);
  });
});

describe("formatPassingDate", () => {
  it("연-월-일을 한글로 풀어 쓴다", () => {
    expect(formatPassingDate("2026-03-01")).toBe("2026년 3월 1일");
    expect(formatPassingDate("2026-11-25")).toBe("2026년 11월 25일");
    expect(formatPassingDate("2026")).toBe("2026");
  });
});
