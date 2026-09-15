import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSections from "@/components/home/HomeSections";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import "./home.css";

export default function Home() {
  return (
    <div className="home-page min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="somang-home">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-stage">
            <div className="home-hero-inner">
              <div className="home-hero-copy">
                <p className="home-eyebrow">소망교회 온라인 추모관</p>
                <h1 id="home-title" className="home-hero-title">
                  소망이 있는 곳
                </h1>
                <p className="home-hero-description">
                  <span>한 사람의 삶과 신앙을</span>
                  <span>가족과 교회가 함께 기억합니다.</span>
                </p>
                <div className="home-hero-actions">
                  <Link
                    href="/memorial/search"
                    className="home-button home-button-primary"
                  >
                    추모관 찾기{" "}
                    <ArrowRight
                      aria-hidden="true"
                      size={20}
                      strokeWidth={1.4}
                    />
                  </Link>
                  <Link
                    href="/memorial/create"
                    className="home-button home-button-secondary"
                  >
                    추모관 만들기{" "}
                    <ArrowRight
                      aria-hidden="true"
                      size={20}
                      strokeWidth={1.4}
                    />
                  </Link>
                </div>
              </div>
            </div>
            <div className="home-hero-visual" aria-hidden="true">
              <img
                src="/hero-somang-memorial-v1.jpg"
                alt=""
                width={1710}
                height={920}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
          <div className="home-hero-bottom">
            <a href="#memorials">
              <span>
                <small aria-hidden="true">01 — OUR STORY</small>함께 간직하는
                기억
              </span>
              <ArrowDown aria-hidden="true" size={22} strokeWidth={1.3} />
            </a>
            <Link href="/login?redirect=/my/find-parent&mode=signup">
              <span>
                <small aria-hidden="true">02 — FAMILY</small>우리 부모님 찾기
              </span>
              <ArrowUpRight aria-hidden="true" size={22} strokeWidth={1.3} />
            </Link>
            <a href="#services">
              <span>
                <small aria-hidden="true">03 — GUIDE</small>이용 안내
              </span>
              <ArrowDown aria-hidden="true" size={22} strokeWidth={1.3} />
            </a>
          </div>
        </section>
        <HomeSections />
      </main>
      <Footer />
    </div>
  );
}
