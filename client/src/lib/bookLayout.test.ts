import { describe, expect, it } from "vitest";
import {
  bookGestureAction,
  layoutBookLeaves,
  photoShape,
  type PhotoShape,
} from "./bookLayout";

type Record = { id: number; photoUrl: string | null };

const noPhoto = (id: number): Record => ({ id, photoUrl: null });
const withPhoto = (id: number): Record => ({ id, photoUrl: `/p/${id}.jpg` });

function kinds(
  records: Record[],
  shapes: { [url: string]: PhotoShape },
  spread: boolean
) {
  return layoutBookLeaves(records, shapes, spread).map(leaf =>
    "record" in leaf ? `${leaf.kind}:${leaf.record.id}` : leaf.kind
  );
}

describe("photoShape", () => {
  it("세로가 더 길면 세로 사진, 아니면 가로 사진", () => {
    expect(photoShape(1122, 1402)).toBe("portrait");
    expect(photoShape(1536, 1024)).toBe("landscape");
    expect(photoShape(1000, 1020)).toBe("landscape");
  });

  it("크기를 모르면 모름", () => {
    expect(photoShape(0, 0)).toBe("unknown");
    expect(photoShape(Number.NaN, 100)).toBe("unknown");
  });
});

describe("layoutBookLeaves", () => {
  it("가로 사진·사진 없는 이야기는 한 쪽에 사진과 글을 함께 둔다", () => {
    expect(
      kinds([noPhoto(1), withPhoto(2)], { "/p/2.jpg": "landscape" }, true)
    ).toEqual(["page:1", "page:2"].concat(["end", "blank"]));
  });

  it("펼침에서 세로 사진은 왼쪽 사진·오른쪽 글로 마주 보게, 필요하면 여백 쪽을 넣는다", () => {
    expect(
      kinds(
        [noPhoto(1), withPhoto(2), withPhoto(3)],
        {
          "/p/2.jpg": "portrait",
          "/p/3.jpg": "portrait",
        },
        true
      )
    ).toEqual([
      "page:1",
      "rest",
      "photo:2",
      "text:2",
      "photo:3",
      "text:3",
      "end",
      "blank",
    ]);
  });

  it("휴대폰(한 쪽씩)에서는 여백 없이 사진 쪽 다음에 글 쪽", () => {
    expect(
      kinds([noPhoto(1), withPhoto(2)], { "/p/2.jpg": "portrait" }, false)
    ).toEqual(["page:1", "photo:2", "text:2", "end"]);
  });

  it("사진 모양을 아직 모르면 나누지 않는다", () => {
    expect(kinds([withPhoto(1)], {}, true)).toEqual(["page:1", "end"]);
  });

  it("펼침에서는 쪽 수가 늘 짝수다", () => {
    const leaves = layoutBookLeaves(
      [withPhoto(1), noPhoto(2), withPhoto(3)],
      { "/p/1.jpg": "portrait", "/p/3.jpg": "portrait" },
      true
    );
    expect(leaves.length % 2).toBe(0);
    leaves.forEach((leaf, index) => {
      if (leaf.kind === "photo") expect(index % 2).toBe(0);
      if (leaf.kind === "text") expect(index % 2).toBe(1);
    });
  });

  it("장 번호는 이야기 순서다 (사진 쪽과 글 쪽이 같은 장)", () => {
    const leaves = layoutBookLeaves(
      [noPhoto(10), withPhoto(20)],
      { "/p/20.jpg": "portrait" },
      false
    );
    expect(
      leaves.map(leaf => ("chapter" in leaf ? leaf.chapter : null))
    ).toEqual([1, 2, 2, null]);
  });
});

describe("bookGestureAction", () => {
  const width = 340;

  it("빠르기와 상관없이 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전", () => {
    expect(bookGestureAction({ dx: -60, dy: 8, startX: 280, width })).toBe(
      "next"
    );
    expect(bookGestureAction({ dx: 60, dy: -8, startX: 60, width })).toBe(
      "prev"
    );
  });

  it("살짝 누르면 오른쪽 절반은 다음, 왼쪽 절반은 이전", () => {
    expect(bookGestureAction({ dx: 3, dy: 2, startX: 250, width })).toBe(
      "next"
    );
    expect(bookGestureAction({ dx: -2, dy: 4, startX: 90, width })).toBe(
      "prev"
    );
  });

  it("위아래로 민 것과 어중간하게 움직인 것은 넘기지 않는다", () => {
    expect(
      bookGestureAction({ dx: 30, dy: 120, startX: 200, width })
    ).toBeNull();
    expect(bookGestureAction({ dx: 25, dy: 5, startX: 200, width })).toBeNull();
  });
});
