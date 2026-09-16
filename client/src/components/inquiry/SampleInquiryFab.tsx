import { Phone } from "lucide-react";
import { useState } from "react";
import InquiryDialog from "./InquiryDialog";
import "./inquiryDialog.css";

/**
 * 예시 추모관 화면 오른쪽 아래(5시 방향)의 "문의하기" 동그라미 (2026-09-17 요청).
 * 이용 안내 인생화원 칸의 "인생화원 예시 보기"로 들어온 분이 바로 문의를 남길 수 있게 한다.
 * 견본 추모관에만 붙인다 (가족들의 실제 추모관에는 없다). 같은 자리의 "맨 위로" 단추는
 * inquiryDialog.css 가 이 동그라미 위로 올린다.
 */
export default function SampleInquiryFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="sample-inquiry-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Phone aria-hidden="true" strokeWidth={1.7} />
        <span>문의하기</span>
      </button>
      {open && <InquiryDialog onClose={() => setOpen(false)} />}
    </>
  );
}
