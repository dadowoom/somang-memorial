/**
 * 키오스크 검색 화면 오른쪽 아래(5시 방향)의 동그라미 단추 두 개 (2026-09-16).
 *
 * - 예시 보기: 추모관이 어떤 모습인지 미리 보여 주는 견본 추모관으로 간다.
 * - 이용 안내: 검색부터 추모관 열람까지의 순서를 큰 글씨로 보여 준다.
 */

/** 견본으로 보여 줄 추모관. 다른 추모관으로 바꾸려면 이 값만 고친다. */
export const KIOSK_SAMPLE_MEMORIAL_SLUG = "kim-somang-kwonsa";

export function kioskSampleMemorialPath() {
  return `/kiosk/memorial/${KIOSK_SAMPLE_MEMORIAL_SLUG}`;
}

export type KioskGuideStep = {
  number: string;
  title: string;
  detail: string;
};

export const KIOSK_GUIDE_STEPS: readonly KioskGuideStep[] = [
  {
    number: "01",
    title: "성함을 입력해 주세요",
    detail:
      "화면 아래 자판으로 고인의 성함을 두 글자 이상 입력하고 검색을 눌러 주세요.",
  },
  {
    number: "02",
    title: "찾으시는 분을 눌러 주세요",
    detail:
      "같은 성함이 여럿이면 직분과 생몰 연도로 구분합니다. 비공개 추모관은 가족이 정한 비밀번호가 필요합니다.",
  },
  {
    number: "03",
    title: "소중한 기억을 만나 보세요",
    detail:
      "사진과 이야기, 가족이 남긴 편지를 보실 수 있습니다. 안장 정보만 있는 분은 자리 안내가 나옵니다.",
  },
  {
    number: "04",
    title: "처음으로 돌아가기",
    detail:
      "잠시 만지지 않으면 처음 화면으로 돌아갑니다. 바로 돌아가려면 왼쪽 위 로고를 눌러 주세요.",
  },
];
