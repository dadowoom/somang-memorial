/**
 * 교회 정보와 개인정보 처리 관련 연락처를 한곳에 모읍니다.
 *
 * 이 파일만 고치면 개인정보처리방침, 이용약관, 사이트 하단 세 곳이 함께 바뀝니다.
 */
export const ORG_INFO = {
  name: "소망교회수양관",
  serviceName: "소망이 있는 곳",

  // 교회 로고. client/public 에 있으므로 주소는 / 로 시작한다.
  logoSrc: "/somang-church-logo.png",

  address: "(06023) 서울특별시 강남구 압구정로36길 55 (신사동)",

  // 개인정보 관련 문의를 받는 주소.
  contactEmail: "contact@dadowoom.com",

  // 대표 전화 = 소망교회 경조부 연락처 (2026-09-17 사용자 결정, 사무실 02-541-3726 에서
  // 010-5307-4404 로 바꿈). 소망동산 번호는 쓰지 않는다. 키오스크 문의 창·홈페이지 문의 창·
  // 이용약관·개인정보처리방침·비밀번호 찾기·사이트 하단·소망동산 방문 안내에 함께 나온다.
  contactPhone: "010-5307-4404",
  contactPhoneLabel: "경조부",

  // 개인정보 보호책임자 (개인정보보호법 제31조). 교회가 처리자이므로 책임자는 교회
  // 쪽 사람으로 둔다 (2026-09-23 사용자 결정: 성함 없이 "경조부 부장"). 문의 응대와
  // 처리 실무는 운영 위탁사(다도움)가 맡는다 — 아래 privacyContact.
  privacyOfficer: {
    name: "",
    position: "소망교회 경조부 부장",
  },
  privacyContact: {
    name: "다도움 (운영 위탁사)",
    role: "개인정보 문의 응대와 처리 실무",
  },

  // 시스템을 만들고 운영하는 업체. 교회가 운영을 맡긴 곳(개인정보 처리 수탁자)이며,
  // 키오스크·홈페이지 "제작 문의"는 이 업체가 직접 받는다 (2026-09-19 점검).
  operator: {
    name: "다도움",
    email: "contact@dadowoom.com",
  },

  // 개인정보처리방침·이용약관 시행일. 내용을 고치면 함께 갱신합니다.
  // 방침 11항대로 바뀐 내용은 시행 7일 전부터 알린다.
  policyEffectiveDate: "2026년 9월 26일",
  previousPolicyDate: "2026년 9월 1일",
} as const;

/** 아직 채워지지 않은 항목인지 알려줍니다. 화면에서 안내 문구를 띄울 때 씁니다. */
export function isOrgInfoIncomplete() {
  return (
    ORG_INFO.address.includes("확인 중") ||
    ORG_INFO.contactEmail.includes("확인 중") ||
    ORG_INFO.privacyOfficer.name.includes("확인 중")
  );
}
