/**
 * 교회 정보와 개인정보 처리 관련 연락처를 한곳에 모읍니다.
 *
 * 이 파일만 고치면 개인정보처리방침, 이용약관, 사이트 하단 세 곳이 함께 바뀝니다.
 */
export const ORG_INFO = {
  name: "소망교회",
  serviceName: "소망이 있는 곳",

  address: "(06023) 서울특별시 강남구 압구정로36길 55 (신사동)",

  // 개인정보 관련 문의를 받는 주소.
  contactEmail: "contact@dadowoom.com",

  contactPhone: "031-764-6052",

  // 개인정보 보호책임자 (개인정보보호법 제31조).
  privacyOfficer: {
    name: "최충만",
    position: "담당",
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
