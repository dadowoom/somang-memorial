import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import GuideFamilyExamples from "@/components/guide/GuideFamilyExamples";
import {
  ArrowDown,
  ArrowRight,
  BookOpenText,
  Film,
  Flower2,
  Images,
  LockKeyhole,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import "./guide.css";

const examples = [
  {
    id: "photos",
    label: "사진",
    icon: Images,
    title: "사진 한 장에, 그날의 마음까지",
    description:
      "함께 웃던 날, 예배를 드리던 모습, 가족과 걸었던 길. 소중한 사진을 한곳에 모아 다시 꺼내 볼 수 있습니다.",
    details: [
      "추모관을 대표하는 사진",
      "여러 장의 사진을 모은 사진첩",
      "사진과 함께 남기는 설명",
    ],
    note: "사진은 ‘내 추모관’에서 추가할 수 있습니다. 소중한 사진이 떠오를 때마다 더해 주세요.",
  },
  {
    id: "story",
    label: "글과 신앙",
    icon: BookOpenText,
    title: "일상의 믿음이, 신앙의 유산으로",
    description:
      "주님과 함께 걸어온 길, 기도와 섬김으로 살아온 날들. 짧은 소개부터 마음에 품은 말씀과 신앙의 고백을 차근차근 담습니다.",
    details: [
      "한 성도를 기억하는 소개글",
      "삶과 신앙의 이야기",
      "마음에 품었던 성경 말씀",
    ],
    note: "처음부터 긴 글을 완성하지 않아도 됩니다. 남긴 글은 나중에 고칠 수 있습니다.",
  },
  {
    id: "video",
    label: "영상",
    icon: Film,
    title: "표정과 목소리도, 오래도록",
    description:
      "처음 교회에 갔던 날, 어려운 시간을 기도로 지나온 이야기. 직접 들려주시는 믿음의 여정을 인터뷰 영상으로 남깁니다.",
    details: [
      "내 목소리로 들려주는 신앙 이야기",
      "자녀와 손주들에게 전하는 축복",
      "말할 때의 표정과 웃음까지",
    ],
    note: "본인이 유튜브에 올린 영상을 링크로 연결합니다. (참고) 유튜브에서 ‘일부 공개’로 설정한 뒤, 링크를 복사해 넣어 주세요.",
  },
] as const;

const steps = [
  {
    title: "회원가입 · 로그인",
    text: "소망교회 성도라면 누구나 회원가입 후 자유롭게 이용하실 수 있습니다. 로그인하고 추모관 만들기를 시작해 주세요.",
  },
  {
    title: "사진과 이야기 올리기",
    text: "기본 정보와 사진, 삶과 신앙의 이야기를 담습니다. 마음에 품은 말씀도 함께 남겨 보세요.",
  },
  {
    title: "추모관 완성",
    text: "올린 기록이 한 성도의 추모관이 됩니다. 완성한 뒤에도 사진과 글을 더하며 추억을 이어갈 수 있습니다.",
  },
];

const questions = [
  {
    title: "누구를 위한 공간인가요?",
    answer:
      "소망교회 성도라면 누구나 회원가입 후 자유롭게 이용하실 수 있습니다. 사진과 글, 말씀과 영상을 남겨 한 성도의 삶과 신앙을 가족과 교회가 함께 기억하고 다음 세대에 전하는 공간입니다.",
  },
  {
    title: "살아 있을 때 미리 만들어도 되나요?",
    answer:
      "네. 미리 추모관을 준비할 때는 소천일을 비워둘 수 있습니다. 지금의 사진과 신앙의 고백을 남기고, 자녀에게 전할 인사는 가족관의 소개글에 적어 두세요.",
  },
  {
    title: "비공개 추모관과 가족관은 어떻게 다른가요?",
    answer:
      "비공개 추모관은 추모관 전체의 공개 범위를 정하는 설정입니다. 검색과 키오스크에서 제외되며 입장 비밀번호가 필요합니다. 가족관은 추모관과 별도로 만든 가족 전용 공간으로, 가족관 주소와 별도의 비밀번호로 들어갑니다. 회원 로그인 비밀번호와도 다릅니다.",
  },
  {
    title: "가족관에 사진도 올릴 수 있나요?",
    answer:
      "현재 가족관에서는 제목과 소개글을 작성할 수 있으며, 가족관 전용 사진 업로드는 아직 지원하지 않습니다. 사진은 추모관 사진첩에 올릴 수 있습니다. 가족에게만 보여줄 사진이라면 추모관의 공개 범위를 비공개로 설정했는지 먼저 확인해 주세요.",
  },
  {
    title: "인생화원은 지금 신청할 수 있나요?",
    answer:
      "인생화원은 신앙의 유산을 더 아름답게 남기기 위해 준비하고 있는 서비스입니다. 현재는 서비스 준비 중이며, 서비스 페이지에서 안내를 확인하실 수 있습니다.",
  },
];

export default function Guide() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const selected = examples[exampleIndex];

  useEffect(() => {
    // The lazy route can mount after the app's initial hash-scroll attempt.
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="guide-page">
      <Navbar />
      <main>
        <section className="guide-hero" aria-labelledby="guide-title">
          <div className="guide-inner guide-hero__grid">
            <div>
              <p className="guide-eyebrow">이용 안내 · 소망이 있는 곳</p>
              <h1 id="guide-title">
                오늘의 기억이,
                <br />
                다음 세대의 신앙으로.
              </h1>
              <p className="guide-hero__description">
                한 성도의 삶과 믿음을, 신앙의 유산으로 남깁니다.
                <br /> 소망교회 성도의 사진과 글, 말씀과 영상을 모아
                <br /> 가족과 교회가 함께 간직하는 온라인 추모관입니다.
              </p>
              <a className="guide-button" href="#records">
                어떻게 남겨지는지 보기{" "}
                <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <figure className="guide-hero__photo">
              <img
                src="/guide-family-garden-v1.jpg"
                width={1536}
                height={1024}
                alt="할머니와 손자, 손녀가 온 가족과 함께 웃는 안내용 AI 이미지"
                fetchPriority="high"
                decoding="async"
              />
              <figcaption>
                <span>SOMANG MEMORIAL</span>
                <span>가족의 기억 · 안내용 AI 이미지</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <nav className="guide-index" aria-label="이용 안내 목차">
          <div className="guide-inner">
            <a href="#records">
              <span>01</span> 기록 예시
            </a>
            <a href="#family">
              <span>02</span> 가족관
            </a>
            <a href="#prepare">
              <span>03</span> 미리 남기기
            </a>
            <a href="#start">
              <span>04</span> 만드는 순서
            </a>
            <a href="#life-garden">
              <span>05</span> 인생화원
            </a>
          </div>
        </nav>

        <section
          id="records"
          className="guide-section guide-records"
          aria-labelledby="guide-records-title"
        >
          <div className="guide-inner">
            <div className="guide-section-heading">
              <div>
                <p className="guide-eyebrow">01 · 기억을 담는 방법</p>
                <h2 id="guide-records-title">
                  한 성도의 삶이,
                  <br />
                  이렇게 남겨집니다.
                </h2>
              </div>
              <p className="guide-description">
                사진을 넘겨 보고, 신앙의 이야기를 읽고,
                <br /> 그리운 목소리를 다시 만나는 공간.
                <br /> 아래에서 기록의 모습을 살펴보세요.
              </p>
            </div>
            <div
              className="guide-example-choices"
              role="group"
              aria-label="기록 예시 선택"
            >
              {examples.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={example.id}
                    type="button"
                    aria-pressed={exampleIndex === index}
                    aria-controls="guide-example"
                    onClick={() => setExampleIndex(index)}
                  >
                    <Icon size={19} strokeWidth={1.4} aria-hidden="true" />
                    {example.label}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div
              id="guide-example"
              className="guide-example"
              aria-live="polite"
              aria-atomic="true"
            >
              <figure className="guide-preview">
                <div className="guide-preview__bar">
                  <span>소망이 있는 곳</span>
                  <span>기록 화면 구성 예시</span>
                </div>
                <div
                  className={`guide-preview__canvas guide-preview__canvas--${selected.id}`}
                >
                  {selected.id === "photos" && (
                    <>
                      <div className="guide-preview__heading">
                        <small>PHOTO ALBUM</small>
                        <h3>함께 간직하는 순간</h3>
                      </div>
                      <div className="guide-preview__album">
                        <figure>
                          <img
                            src="/guide-family-garden-v1.jpg"
                            alt="할머니와 온 가족이 함께한 안내용 AI 사진 예시"
                            loading="lazy"
                          />
                          <figcaption>함께 웃던 날</figcaption>
                        </figure>
                        <figure>
                          <img
                            src="/guide-family-album-v1.jpg"
                            alt="할머니와 손자, 손녀가 사진첩을 보는 안내용 AI 사진 예시"
                            loading="lazy"
                          />
                          <figcaption>할머니와 나눈 이야기</figcaption>
                        </figure>
                      </div>
                    </>
                  )}
                  {selected.id === "story" && (
                    <>
                      <div className="guide-preview__heading">
                        <small>나의 신앙 고백 · 예시</small>
                        <h3>평생 나를 인도하신 주님</h3>
                      </div>
                      <blockquote className="guide-preview__verse">
                        “여호와는 나의 목자시니
                        <br />
                        내게 부족함이 없으리로다”
                        <cite>시편 23:1</cite>
                      </blockquote>
                      <p className="guide-preview__story">
                        아이들을 키우며 살림이 빠듯하던 날에도, 몸이 아파 잠 못
                        이루던 밤에도 시편 23편을 읽으며 기도했습니다. 앞날이
                        막막할 때마다 저의 목자 되신 주님께 맡기고, 그날 제게
                        주어진 일을 감당했습니다.
                      </p>
                      <p className="guide-preview__story">
                        평생 예배의 자리를 지키고, 이웃과 가진 것을 나누며
                        살고자 했습니다. 부족하고 넘어질 때도 많았지만, 주님은
                        늘 다시 일어설 힘을 주셨습니다. 남은 날들도 감사로 살며,
                        자녀와 손주들이 이 믿음 안에서 살아가기를 기도합니다.
                      </p>
                    </>
                  )}
                  {selected.id === "video" && (
                    <>
                      <div className="guide-preview__heading">
                        <small>FAITH INTERVIEW</small>
                        <h3>다시 만나는 목소리</h3>
                      </div>
                      <div className="guide-preview__film">
                        <img
                          src="/guide-grandmother-interview-v1.jpg"
                          alt="마이크를 달고 믿음의 이야기를 들려주는 할머니의 인터뷰 표지용 AI 이미지"
                          width={1672}
                          height={941}
                          loading="lazy"
                        />
                        <div>
                          <span className="guide-preview__interview-label">
                            <Film
                              size={16}
                              strokeWidth={1.3}
                              aria-hidden="true"
                            />
                            신앙의 기억 · 인터뷰 예시
                          </span>
                          <div className="guide-preview__interview-title">
                            <span>
                              할머니가 들려주는
                              <br />
                              믿음의 이야기
                            </span>
                            <small>
                              인터뷰 표지 예시 · 재생 영상이 아닙니다
                            </small>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <figcaption className="guide-preview__caption">
                  이해를 돕기 위한 구성 예시입니다. 가족 사진은 AI로 만든
                  이미지이며, 글은 안내용 예시 문구입니다.
                </figcaption>
              </figure>
              <div className="guide-example__copy">
                <p className="guide-eyebrow">
                  {String(exampleIndex + 1).padStart(2, "0")} / 03
                </p>
                <h3>{selected.title}</h3>
                <p className="guide-description">{selected.description}</p>
                <ul>
                  {selected.details.map(detail => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <p className="guide-note">{selected.note}</p>
              </div>
            </div>
            <Link className="guide-text-link" href="/memorial/search">
              추모관 찾아보기 <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          id="family"
          className="guide-section guide-family"
          aria-labelledby="guide-family-title"
        >
          <div className="guide-inner guide-family__grid">
            <div>
              <p className="guide-eyebrow">02. 가족에게 남기는 글</p>
              <h2 id="guide-family-title">가족 전용 공간</h2>
              <p className="guide-description">
                가족에게만 전하고 싶은
                <br /> 사랑과 믿음의 이야기를 남겨요.
              </p>
              <div className="guide-family__privacy">
                <LockKeyhole size={20} strokeWidth={1.3} aria-hidden="true" />
                <span>비밀번호로 여는 가족관</span>
              </div>
            </div>
            <GuideFamilyExamples />
          </div>
        </section>

        <section
          id="prepare"
          className="guide-section guide-prepare"
          aria-labelledby="guide-prepare-title"
        >
          <div className="guide-inner">
            <div className="guide-section-heading">
              <div>
                <p className="guide-eyebrow">03 · 미리 남기는 마음</p>
                <h2 id="guide-prepare-title">
                  추모관은,
                  <br />
                  미리 남겨도 좋습니다.
                </h2>
              </div>
              <div className="guide-prepare__intro">
                <p className="guide-description">
                  주님과 함께 걸어온 믿음의 길을 내 말로 남겨 보세요. 자녀에게
                  전하는 마지막 인사에 감사와 사랑, 축복의 마음을 담을 수
                  있습니다.
                </p>
                <p className="guide-note">
                  미리 추모관을 만들 때는 소천일을 비워둘 수 있습니다.
                  가족에게만 전할 인사는 가족관의 소개글에 남겨 주세요.
                </p>
              </div>
            </div>
            <p className="guide-prepare__lead">
              어디서 시작할지 막막하다면, 이 세 가지부터.
            </p>
            <div className="guide-prompts">
              <article>
                <span>01</span>
                <h3>나를 지켜 준 말씀</h3>
                <p>
                  삶의 어려운 순간에 힘이 되었던 말씀과 그때의 이야기를 적어
                  보세요.
                </p>
              </article>
              <article>
                <span>02</span>
                <h3>다시 꺼내 보고 싶은 사진</h3>
                <p>
                  잘 나온 사진보다, 가족과 함께한 마음이 떠오르는 한 장을 골라
                  보세요.
                </p>
              </article>
              <article>
                <span>03</span>
                <h3>자녀에게 전하고 싶은 말</h3>
                <p>
                  고맙다는 말, 사랑한다는 말. 평소 다 전하지 못한 인사를 남겨
                  보세요.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          id="start"
          className="guide-section guide-start"
          aria-labelledby="guide-start-title"
        >
          <div className="guide-inner">
            <div className="guide-section-heading">
              <div>
                <p className="guide-eyebrow">04 · 만드는 순서</p>
                <h2 id="guide-start-title">
                  한 번에 다 담지 않아도,
                  <br />한 걸음씩 시작하세요.
                </h2>
              </div>
              <Link className="guide-button" href="/memorial/create">
                추모관 만들기 <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <ol className="guide-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="guide-steps__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="life-garden"
          className="guide-section guide-garden"
          aria-labelledby="guide-garden-title"
        >
          <div className="guide-inner guide-garden__grid">
            <div className="guide-garden__symbol" aria-hidden="true">
              <Flower2 size={112} strokeWidth={0.65} />
              <span>LIFE GARDEN</span>
            </div>
            <div>
              <p className="guide-eyebrow">05 · 신앙의 유산 남기기 서비스</p>
              <h2 id="guide-garden-title">
                더 아름답게 남기는 방법,
                <br />
                인생화원.
              </h2>
              <p className="guide-description">
                한 성도의 믿음의 여정이 다음 세대에 전해지도록.
                <br /> 신앙의 유산을 더 아름답게 담아내는 인생화원 서비스를
                준비하고 있습니다.
              </p>
              <div className="guide-garden__action">
                <Link className="guide-button" href="/services/life-garden">
                  인생화원 서비스 알아보기{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <span>서비스 준비 중</span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="guide-section guide-faq"
          aria-labelledby="guide-faq-title"
        >
          <div className="guide-inner guide-faq__grid">
            <div>
              <p className="guide-eyebrow">궁금한 점을 모았습니다</p>
              <h2 id="guide-faq-title">시작하기 전에</h2>
            </div>
            <div>
              {questions.map(question => (
                <details key={question.title} name="guide-faq">
                  <summary>
                    {question.title}
                    <Plus size={20} strokeWidth={1.3} aria-hidden="true" />
                  </summary>
                  <p>{question.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          className="guide-closing"
          aria-labelledby="guide-closing-title"
        >
          <div className="guide-inner">
            <p className="guide-eyebrow">
              신앙의 유산, 100년을 담아 100년을 남깁니다.
            </p>
            <h2 id="guide-closing-title">
              오늘 남긴 마음이,
              <br />
              다음 세대에게 소망이 됩니다.
            </h2>
            <Link
              className="guide-button guide-button--light"
              href="/memorial/create"
            >
              나의 신앙 이야기 남기기{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="guide-closing__letter-link" href="/letters">
              그리운 분께 편지 보내기{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
