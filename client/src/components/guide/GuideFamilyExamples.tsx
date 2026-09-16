import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Film, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

const labels = ["글 예시", "사진 예시", "영상 예시"];

export default function GuideFamilyExamples() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <Carousel
      className="guide-family-examples"
      aria-label="가족관 기록 예시"
      aria-roledescription="슬라이드"
      opts={{ loop: true, duration: reducedMotion ? 0 : 25 }}
      setApi={setApi}
    >
      <CarouselContent className="guide-family-examples__track">
        {labels.map((label, index) => (
          <CarouselItem
            key={label}
            className="guide-family-examples__slide"
            aria-label={`${index + 1} / ${labels.length} · ${label}`}
            aria-roledescription="예시"
            aria-hidden={selected !== index}
          >
            <figure className="guide-family-card">
              <div className="guide-family-card__header">
                <LockKeyhole size={16} strokeWidth={1.4} aria-hidden="true" />
                <span>우리 가족의 공간</span>
                <span>{label}</span>
              </div>
              {index === 0 && (
                <div className="guide-family-card__letter">
                  <p className="guide-family-card__salutation">
                    사랑하는 나의 아이들에게
                  </p>
                  <blockquote>
                    <p>
                      너희와 함께한 모든 날이
                      <br /> 하나님이 주신 선물이었단다.
                    </p>
                    <p>
                      언제나 주님 안에서 서로 사랑하며 살아가렴.
                      <br /> 너희의 모든 날을 사랑하고 축복한다.
                    </p>
                  </blockquote>
                  <p className="guide-family-card__signature">
                    사랑과 기도를 담아
                  </p>
                </div>
              )}
              {index === 1 && (
                <div className="guide-family-card__photo">
                  <img
                    src="/guide-family-birthday-v1.jpg"
                    alt="집에서 할머니의 생신을 함께 축하하는 딸과 손주들의 안내용 AI 이미지"
                    width={1536}
                    height={1024}
                    loading="lazy"
                    draggable={false}
                  />
                  <div>
                    <small>우리끼리 간직하는 순간</small>
                    <p>할머니 생신날, 우리 집에서</p>
                  </div>
                </div>
              )}
              {index === 2 && (
                <div className="guide-family-card__video">
                  <img
                    src="/guide-grandmother-farewell-v1.jpg"
                    alt="카메라를 바라보며 자녀와 손주들에게 마지막 인사를 남기는 할머니의 안내용 AI 이미지"
                    width={1536}
                    height={1024}
                    loading="lazy"
                    draggable={false}
                  />
                  <div>
                    <small>
                      <Film size={16} strokeWidth={1.2} aria-hidden="true" />
                      가족에게 남기는 마지막 인사
                    </small>
                    <p>
                      사랑하는
                      <br />
                      우리 아이들에게
                    </p>
                    <span>영상 표지 예시</span>
                  </div>
                </div>
              )}
              <figcaption>
                {index === 0
                  ? "가족에게 전하는 인사 · 안내용 글 예시"
                  : index === 1
                    ? "사진 구성 예시 · 안내용 AI 이미지"
                    : "영상 구성 예시 · 재생 영상이 아닌 AI 이미지"}
              </figcaption>
            </figure>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="guide-family-examples__controls">
        <div
          className="guide-family-examples__choices"
          role="group"
          aria-label="가족관 예시 선택"
        >
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={selected === index}
              onClick={() => api?.scrollTo(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="guide-family-examples__arrows">
          <CarouselPrevious
            className="guide-family-examples__arrow"
            aria-label="이전 가족관 예시"
          />
          <CarouselNext
            className="guide-family-examples__arrow"
            aria-label="다음 가족관 예시"
          />
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {labels[selected]}, {selected + 1} / {labels.length}
      </p>
      <p className="guide-family-examples__notice">
        가족관에는 글과 사진, 유튜브 영상을 남길 수 있습니다. 위 화면은 구성
        예시입니다.
      </p>
    </Carousel>
  );
}
