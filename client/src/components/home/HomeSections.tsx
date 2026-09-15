import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Flower2,
  Plus,
  Send,
} from "lucide-react";
import { Link } from "wouter";
import "./homeSections.css";

const VALUES = [
  {
    number: "01",
    title: "가족에게는 위로",
    desc: "사진과 글에 담긴 그리운 순간을 돌아보며, 가족이 함께 기억을 나눕니다.",
  },
  {
    number: "02",
    title: "교회에는 기억",
    desc: "한 성도의 예배와 봉사, 기도와 헌신은 소망교회가 걸어온 믿음의 길 위에 남겨진 귀한 흔적입니다.",
  },
  {
    number: "03",
    title: "다음 세대에는 신앙의 유산",
    desc: "자녀와 손주들이 부모와 조부모의 삶의 고백을 만나고, 말로 다 전하지 못한 신앙의 이야기를 이어받습니다.",
  },
];

const SERVICES = [
  {
    number: "01",
    title: "추모관 만들기",
    desc: "한 성도의 삶과 신앙을 사진과 글로 차근차근 남깁니다.",
    icon: BookOpenText,
    href: "/memorial/create",
    action: "기억 남기기",
  },
  {
    number: "02",
    title: "인생화원",
    desc: "신앙의 유산 남기기 서비스",
    icon: Flower2,
    href: "/services/life-garden",
    action: "서비스 이용하기",
  },
  {
    number: "03",
    title: "편지 남기기",
    desc: "다 전하지 못한 말과 함께한 기억을 편지에 담습니다.",
    icon: Send,
    href: "/letters",
    action: "마음 전하기",
  },
];

const STEPS = [
  "처음 방문하셨다면 회원가입을, 이미 가입하셨다면 로그인을 해 주세요.",
  "성도의 기본 정보와 신앙의 이야기를 작성하고, 등록 요청 후 사진을 준비합니다.",
  "관리자 확인 후 공개된 추모관의 링크를 가족과 공동체에 공유합니다.",
];

export default function HomeSections() {
  return (
    <div className="home-sections">
      <section
        id="memorials"
        className="home-sections__memories"
        aria-labelledby="home-memories-heading"
      >
        <div className="home-sections__inner">
          <div className="home-sections__heading-group">
            <p className="home-sections__eyebrow">함께 간직하는 기억</p>
            <h2 id="home-memories-heading" className="home-sections__heading">
              <span>삶과 신앙의 이야기를</span> <span>함께 간직하고</span>{" "}
              <span>다음 세대에 전합니다.</span>
            </h2>
          </div>

          <div className="home-sections__memories-grid">
            <figure className="home-sections__place">
              <Link
                href="/somang-hill"
                className="home-sections__place-image-frame"
                aria-label="소망동산 둘러보기"
              >
                <img
                  src="/somang-hill-1.jpg"
                  alt="소망동산의 정원과 추모 공간 전경"
                  width={800}
                  height={533}
                  loading="lazy"
                  decoding="async"
                  className="home-sections__place-image"
                />
              </Link>
              <figcaption className="home-sections__place-caption">
                <span>소망동산</span>
                <Link href="/somang-hill">
                  공간 둘러보기 <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </figcaption>
            </figure>

            <div className="home-sections__values">
              {VALUES.map((value, index) => (
                <details
                  key={value.number}
                  name="home-values"
                  open={index === 0}
                  className="home-sections__value"
                >
                  <summary>
                    <span
                      className="home-sections__value-number"
                      aria-hidden="true"
                    >
                      {value.number}
                    </span>
                    <h3 className="home-sections__value-title">
                      {value.title}
                    </h3>
                    <Plus size={18} strokeWidth={1.2} aria-hidden="true" />
                  </summary>
                  <p className="home-sections__body">{value.desc}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="home-sections__services"
        aria-labelledby="home-services-heading"
      >
        <div className="home-sections__inner">
          <div className="home-sections__section-header">
            <div className="home-sections__heading-group">
              <p className="home-sections__eyebrow">이용 안내</p>
              <h2 id="home-services-heading" className="home-sections__heading">
                <span>함께 기억하는</span> <span>세 가지 방법</span>
              </h2>
            </div>
            <p className="home-sections__intro home-sections__body">
              믿음의 여정을 기록하고, 신앙의 유산을 남기며, 그리운 마음을 함께
              나눕니다.
            </p>
          </div>

          <div className="home-sections__service-grid">
            {SERVICES.map(service => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.number}
                  href={service.href}
                  aria-label={service.title}
                  className="home-sections__service-card"
                >
                  <div className="home-sections__service-top">
                    <span
                      className="home-sections__service-icon"
                      aria-hidden="true"
                    >
                      <Icon size={25} strokeWidth={1.5} />
                    </span>
                    <span
                      className="home-sections__service-number"
                      aria-hidden="true"
                    >
                      {service.number}
                    </span>
                  </div>
                  <h3 className="home-sections__service-title">
                    {service.title}
                  </h3>
                  <p className="home-sections__body">{service.desc}</p>
                  <span
                    className="home-sections__service-action"
                    aria-hidden="true"
                  >
                    {service.action}
                    <ArrowUpRight size={22} strokeWidth={1.3} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="process"
        className="home-sections__process"
        aria-labelledby="home-process-heading"
      >
        <div className="home-sections__inner">
          <div className="home-sections__heading-group">
            <p className="home-sections__eyebrow">준비 순서</p>
            <h2 id="home-process-heading" className="home-sections__heading">
              <span>추모관을</span> <span>준비하는 순서</span>
            </h2>
          </div>

          <ol className="home-sections__steps">
            {STEPS.map((step, index) => (
              <li key={step} className="home-sections__step">
                <span className="home-sections__step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="home-sections__step-text">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="membership"
        className="home-sections__membership"
        aria-labelledby="home-membership-heading"
      >
        <div className="home-sections__inner home-sections__membership-inner">
          <div className="home-sections__membership-copy">
            <p className="home-sections__eyebrow">소망교회 성도 전용</p>
            <h2 id="home-membership-heading" className="home-sections__heading">
              <span>소중한 기억을,</span> <span>하나씩 남겨 주세요</span>
            </h2>
            <p className="home-sections__membership-description">
              회원가입 후 추모관과 부고장을 만들 수 있습니다. 추모의 마음은
              편지로 함께 나눌 수 있습니다.
            </p>
          </div>
          <Link href="/memorial/create" className="home-sections__cta-button">
            추모관 만들기
            <ArrowRight size={30} strokeWidth={1.2} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
