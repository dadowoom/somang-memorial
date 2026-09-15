import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ArrowRight, Flower2 } from "lucide-react";
import { Link } from "wouter";
import "./publicEditorial.css";
import "./lifeGarden.css";

export default function LifeGarden() {
  return (
    <div className="public-editorial life-garden-page">
      <Navbar />
      <main>
        <section className="public-hero" aria-labelledby="life-garden-title">
          <div className="container">
            <p className="life-garden-eyebrow">신앙의 유산 남기기 서비스</p>
            <h1 id="life-garden-title">인생화원</h1>
          </div>
        </section>
        <section
          className="life-garden-notice"
          aria-labelledby="life-garden-status"
        >
          <div className="container">
            <Flower2
              className="public-empty__icon"
              size={36}
              strokeWidth={1.2}
              aria-hidden="true"
            />
            <h2 id="life-garden-status">서비스 준비 중</h2>
            <p>
              한 성도의 삶과 신앙이 다음 세대에 아름답게 전해지도록 <br />
              인생화원 서비스를 준비하고 있습니다.
            </p>
            <Link href="/" className="editorial-action life-garden-home">
              홈으로 돌아가기
              <ArrowRight size={18} strokeWidth={1.4} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
