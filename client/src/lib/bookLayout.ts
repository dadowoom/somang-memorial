/**
 * 책장(신앙의 여정)의 쪽 배치와 손가락 넘기기 (2026-09-16 현장 요청).
 *
 * - "사진 잘리게 하지 마라": 사진은 원래 비율 그대로 보인다(memorialBook.css).
 * - "세로 사진이면 한쪽엔 사진, 한쪽엔 글": 세로 사진이 있는 이야기는 사진 쪽과
 *   글 쪽 두 장으로 나눈다. 두 쪽 펼침(PC·키오스크)에서는 사진이 왼쪽, 글이 오른쪽에
 *   마주 보게 하고, 사진이 오른쪽 쪽에 걸리면 앞에 여백 쪽을 하나 넣는다.
 *   한 쪽씩 보는 휴대폰에서는 사진 쪽 다음에 글 쪽이 온다.
 * - "모바일에서 책 넘기는 게 이상하다": 책 부품의 기본 터치 처리는 0.25초 안에 끝나는
 *   빠른 밀기만 넘김으로 알아봐서, 보통 속도로 밀면 안 넘어갔다(휴대폰 크기 화면에서 재현).
 *   그래서 밀기·누르기는 여기서 직접 알아보고 부품의 넘김 애니메이션만 쓴다.
 */

export type PhotoShape = "portrait" | "landscape" | "unknown";

/** 세로가 가로보다 이만큼 이상 길면 세로 사진으로 본다. 정사각형에 가까우면 가로처럼 둔다. */
const PORTRAIT_RATIO = 1.05;

/** 사진 크기를 알아보는 데 기다리는 최대 시간. 넘으면 모르는 사진은 한 쪽에 사진과 글을 함께 둔다. */
export const BOOK_PHOTO_SHAPE_TIMEOUT_MS = 3000;

export function photoShape(width: number, height: number): PhotoShape {
  if (!(width > 0) || !(height > 0)) return "unknown";
  return height > width * PORTRAIT_RATIO ? "portrait" : "landscape";
}

export type BookLeaf<P> =
  /** 사진(가로 사진이거나 없음)과 글을 한 쪽에 */
  | { kind: "page"; record: P; chapter: number }
  /** 세로 사진만 한 쪽 가득 */
  | { kind: "photo"; record: P; chapter: number }
  /** 세로 사진과 마주 보는 글 쪽 */
  | { kind: "text"; record: P; chapter: number }
  /** 세로 사진이 왼쪽에 오도록 넣는 여백 쪽 */
  | { kind: "rest" }
  /** 마지막 쪽 (오직 하나님께 영광) */
  | { kind: "end" }
  /** 두 쪽 펼침에서 쪽 수를 짝수로 맞추는 빈 쪽 */
  | { kind: "blank" };

export function layoutBookLeaves<P extends { photoUrl: string | null }>(
  records: P[],
  shapes: Record<string, PhotoShape>,
  spread: boolean
): BookLeaf<P>[] {
  const leaves: BookLeaf<P>[] = [];

  records.forEach((record, index) => {
    const chapter = index + 1;
    const shape = record.photoUrl ? shapes[record.photoUrl] : undefined;

    if (record.photoUrl && shape === "portrait") {
      if (spread && leaves.length % 2 === 1) leaves.push({ kind: "rest" });
      leaves.push({ kind: "photo", record, chapter });
      leaves.push({ kind: "text", record, chapter });
      return;
    }

    leaves.push({ kind: "page", record, chapter });
  });

  leaves.push({ kind: "end" });
  if (spread && leaves.length % 2 === 1) leaves.push({ kind: "blank" });
  return leaves;
}

/** 이만큼 이상 옆으로 밀면 넘긴다(px). */
export const BOOK_SWIPE_MIN_PX = 40;
/** 이보다 적게 움직였으면 누른 것으로 본다(px). */
export const BOOK_TAP_SLOP_PX = 12;

export type BookGestureAction = "next" | "prev" | null;

/**
 * 손가락(또는 마우스)을 떼었을 때 무엇을 할지 정한다. 빠르기는 따지지 않는다.
 * - 옆으로 40px 이상, 위아래보다 옆으로 더 밀었으면: 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전.
 * - 거의 움직이지 않고 눌렀으면: 책 오른쪽 절반은 다음, 왼쪽 절반은 이전.
 * - 위아래로 민 것은 넘기지 않는다(글을 스크롤할 때).
 */
export function bookGestureAction(input: {
  dx: number;
  dy: number;
  /** 누르기 시작한 자리. 책 왼쪽 끝에서부터 잰다. */
  startX: number;
  /** 책 가로 길이 */
  width: number;
}): BookGestureAction {
  const absX = Math.abs(input.dx);
  const absY = Math.abs(input.dy);

  if (absX >= BOOK_SWIPE_MIN_PX && absX >= absY) {
    return input.dx < 0 ? "next" : "prev";
  }

  if (absX <= BOOK_TAP_SLOP_PX && absY <= BOOK_TAP_SLOP_PX && input.width > 0) {
    return input.startX < input.width / 2 ? "prev" : "next";
  }

  return null;
}
