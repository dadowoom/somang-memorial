import { ORG_INFO } from "@/lib/orgInfo";

/**
 * 키오스크 "문의" 창의 글 (2026-09-16). 화면은 반반이다.
 * 왼쪽: 소망교회 경조부(교회에 직접 연락). 오른쪽: 추모관 제작 업체(번호를 남기면 전화).
 * 전화번호·문구를 바꾸려면 이 파일만 고친다.
 */
export const CHURCH_INQUIRY = {
  eyebrow: "01 · 교회에 문의",
  title: "소망교회 경조부",
  phone: ORG_INFO.contactPhone,
  lines: [
    "장례·추모 예배·안장에 관한 문의는 교회 경조부로 연락해 주세요.",
    "추모관에 실린 고인 정보 수정도 교회를 통해 요청하실 수 있습니다.",
  ],
} as const;

export const COMPANY_INQUIRY = {
  eyebrow: "02 · 추모관 제작 문의",
  title: "우리 가족의 추모관 만들기",
  lines: [
    "이 추모관을 만든 제작 업체에 문의하실 수 있습니다.",
    "전화번호를 남겨 주시면 확인 후 담당자가 전화드립니다.",
  ],
  consent:
    "남겨 주신 번호는 추모관 제작 문의 연락에만 쓰고, 연락이 끝나면 지웁니다.",
  submitLabel: "문의 신청",
  doneTitle: "접수되었습니다",
  doneText: "담당자가 확인한 뒤 남겨 주신 번호로 전화드리겠습니다.",
} as const;

/** 접수 완료 화면이 스스로 닫히기까지. */
export const KIOSK_INQUIRY_DONE_CLOSE_MS = 12_000;
