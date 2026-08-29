/**
 * 교회 정보와 개인정보 처리 관련 연락처를 한곳에 모읍니다.
 *
 * ⚠️ 아래 TODO 로 표시된 값은 소망교회에서 확인해 주셔야 합니다.
 *    개인정보처리방침과 이용약관, 사이트 하단에 함께 반영됩니다.
 *    이 파일만 고치면 세 곳이 한 번에 바뀝니다.
 */
export const ORG_INFO = {
  name: "소망교회",
  serviceName: "소망이 있는 곳",

  // TODO(교회 확인): 실제 주소로 교체해 주세요.
  address: "주소 확인 중",

  // TODO(교회 확인): 문의를 받을 이메일 주소.
  contactEmail: "문의 이메일 확인 중",

  // TODO(교회 확인): 대표 전화번호.
  contactPhone: "대표 전화 확인 중",

  // TODO(교회 확인): 개인정보 보호책임자 (개인정보보호법 제31조).
  privacyOfficer: {
    name: "확인 중",
    position: "확인 중",
  },

  // 개인정보처리방침 시행일. 내용을 고치면 함께 갱신합니다.
  policyEffectiveDate: "2026년 9월 1일",
} as const;

/** 아직 채워지지 않은 항목인지 알려줍니다. 화면에서 안내 문구를 띄울 때 씁니다. */
export function isOrgInfoIncomplete() {
  return (
    ORG_INFO.address.includes("확인 중") ||
    ORG_INFO.contactEmail.includes("확인 중") ||
    ORG_INFO.privacyOfficer.name.includes("확인 중")
  );
}
