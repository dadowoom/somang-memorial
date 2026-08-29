import LegalPage, { LegalList, LegalSection } from "@/components/LegalPage";
import { ORG_INFO } from "@/lib/orgInfo";

export default function Terms() {
  return (
    <LegalPage
      eyebrow="TERMS"
      title="이용약관"
      effectiveDate={ORG_INFO.policyEffectiveDate}
      intro={`${ORG_INFO.name}가 운영하는 온라인 추모 서비스 「${ORG_INFO.serviceName}」의 이용 조건을 안내합니다. 서비스를 이용하시기 전에 읽어 주십시오.`}
    >
      <LegalSection heading="1. 목적">
        <p>
          이 약관은 {ORG_INFO.name}(이하 "교회")가 제공하는 온라인 추모 서비스
          「{ORG_INFO.serviceName}」(이하 "서비스")를 이용하는 데 필요한 사항을
          정합니다.
        </p>
      </LegalSection>

      <LegalSection heading="2. 서비스의 성격">
        <p>
          이 서비스는 <strong>영리를 목적으로 하지 않습니다.</strong> 믿음으로
          살다 주님 품에 안긴 성도의 삶과 신앙을 가족과 교회 공동체가 함께
          기억하기 위해 교회가 무상으로 제공합니다.
        </p>
        <p>서비스는 다음을 제공합니다.</p>
        <LegalList
          items={[
            "고인의 생애와 신앙을 기록하는 온라인 추모관",
            "소망동산 안장 기록에서 부모님을 찾는 기능",
            "고인에게 남기는 추모 편지",
            "가족만 볼 수 있는 비공개 공간",
            "추도일 문자 알림",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. 회원가입">
        <p>
          추모관을 만들려면 회원가입이 필요합니다. 가입하실 때 성함, 이메일,
          휴대폰 번호를 받으며, 그 쓰임은 개인정보처리방침에 적어 두었습니다.
        </p>
        <p>
          한 사람이 여러 계정을 만들거나, 다른 사람의 정보로 가입하시면 안
          됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="4. 추모관의 등록과 책임">
        <p>
          추모관을 만드시는 분은{" "}
          <strong>고인의 가족이거나 유가족의 동의를 받은 분</strong>이어야
          합니다. 서비스는 등록하시는 분이 그 권한이 있음을 확인하는 절차를 두고
          있습니다.
        </p>
        <p>
          등록하신 내용(사진, 글, 고인의 정보)에 대한 책임은 등록하신 분에게
          있습니다. 다른 사람의 권리를 침해하는 자료를 올리시면 안 됩니다.
        </p>
        <p>
          교회는 등록된 추모관을 서비스 운영에 필요한 범위에서 보관하고
          보여드립니다. 고인을 기억하기 위한 자료이므로, 등록하신 분의 삭제
          요청이 없는 한 계속 보존합니다.
        </p>
      </LegalSection>

      <LegalSection heading="5. 이용자가 하시면 안 되는 일">
        <LegalList
          items={[
            "고인이나 유가족의 명예를 훼손하는 글이나 사진을 올리는 일",
            "욕설, 비방, 광고, 반복적인 도배 글을 남기는 일",
            "다른 사람의 개인정보를 동의 없이 올리는 일",
            "다른 사람의 저작물을 권리자의 허락 없이 올리는 일",
            "다른 사람의 계정이나 비공개 추모관에 무단으로 접근하려는 일",
            "서비스의 정상적인 운영을 방해하는 일",
          ]}
        />
        <p>
          위와 같은 일이 확인되면 교회는 해당 게시물을 보이지 않게 하거나 삭제할
          수 있고, 반복되는 경우 계정 이용을 제한할 수 있습니다. 조치 전에
          가능한 한 미리 알려드립니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 추모 편지의 공개">
        <p>
          추모 편지는 남기시는 즉시 추모관에 표시됩니다. 다만 위 5항에 해당하는
          내용이 확인되면 교회가 보이지 않게 할 수 있습니다.
        </p>
        <p>유가족께서 특정 편지를 내려 달라고 요청하시면 확인 후 처리합니다.</p>
      </LegalSection>

      <LegalSection heading="7. 서비스의 변경과 중단">
        <p>
          교회는 서비스 내용을 바꾸거나 중단할 수 있습니다. 이 경우 미리
          알려드립니다. 다만 시스템 점검, 고장, 천재지변 등 미리 알리기 어려운
          사정이 있을 때에는 사후에 알려드립니다.
        </p>
      </LegalSection>

      <LegalSection heading="8. 회원 탈퇴">
        <p>
          이용자는 언제든지 탈퇴하실 수 있습니다. 탈퇴하시면 회원 정보는 지체
          없이 파기합니다.
        </p>
        <p>
          다만 이미 등록하신 추모관은 고인을 기억하는 공동의 기록이므로,
          탈퇴만으로 자동 삭제되지 않습니다. 추모관까지 지우고 싶으시면 탈퇴
          전에 삭제하시거나 아래 연락처로 요청해 주십시오.
        </p>
      </LegalSection>

      <LegalSection heading="9. 교회의 책임">
        <p>
          교회는 서비스를 안정적으로 운영하기 위해 힘쓰지만, 이용자가 올린
          내용의 정확성이나 그로 인해 생긴 분쟁에 대해서는 책임지지 않습니다.
        </p>
        <p>
          천재지변, 통신 장애 등 교회가 어찌할 수 없는 사정으로 서비스를
          제공하지 못한 경우에도 책임을 지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="10. 문의와 분쟁">
        <p>
          서비스 이용에 관한 문의는 {ORG_INFO.contactEmail} 또는{" "}
          {ORG_INFO.contactPhone}으로 연락해 주십시오.
        </p>
        <p>
          분쟁이 생긴 경우 교회와 이용자는 성실히 협의하여 해결합니다. 협의가
          이루어지지 않으면 관계 법령과 상관례에 따릅니다.
        </p>
      </LegalSection>

      <LegalSection heading="11. 약관의 변경">
        <p>
          이 약관을 고칠 때에는 바뀌는 내용과 시행일을 시행 7일 전부터 이
          페이지에 알립니다. 이용자에게 불리한 변경은 30일 전부터 알립니다.
        </p>
        <p>이 약관은 {ORG_INFO.policyEffectiveDate}부터 적용됩니다.</p>
      </LegalSection>
    </LegalPage>
  );
}
