import { describe, expect, it } from "vitest";
import {
  describeBlockedMemorials,
  planMemorialHandover,
} from "./accountDeletion";

const withFamily = {
  id: 1,
  name: "김소망",
  slug: "kim-somang-kwonsa",
  members: [
    { userId: 8, name: "둘째" },
    { userId: 9, name: "셋째" },
  ],
};
const alone = { id: 2, name: "이믿음", slug: "lee-mideum", members: [] };

describe("planMemorialHandover", () => {
  it("추모관이 없으면 아무것도 막지 않는다", () => {
    expect(planMemorialHandover([])).toEqual({ blocked: [], transfers: [] });
  });

  it("가족이 있으면 가장 먼저 들어온 가족에게 넘긴다", () => {
    const plan = planMemorialHandover([withFamily]);
    expect(plan.blocked).toEqual([]);
    expect(plan.transfers).toEqual([
      {
        memorialId: 1,
        name: "김소망",
        slug: "kim-somang-kwonsa",
        toUserId: 8,
        toName: "둘째",
      },
    ]);
  });

  it("가족이 없는 추모관은 막힌 목록에 들어간다", () => {
    const plan = planMemorialHandover([withFamily, alone]);
    expect(plan.blocked).toEqual([
      { id: 2, name: "이믿음", slug: "lee-mideum" },
    ]);
    expect(plan.transfers).toHaveLength(1);
  });
});

describe("describeBlockedMemorials", () => {
  it("추모관 이름과 할 일을 쉬운 말로 알려 준다", () => {
    const text = describeBlockedMemorials([
      { id: 2, name: "이믿음", slug: "lee-mideum" },
    ]);
    expect(text).toContain("이믿음");
    expect(text).toContain("가족 초대");
    expect(text).toContain("교회");
  });
});
