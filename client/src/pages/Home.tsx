import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeSections from "@/components/home/HomeSections";
import {
  ArrowDown,
  ArrowRight,
  HeartHandshake,
  Plus,
  Search,
} from "lucide-react";
import { Link } from "wouter";
import "./home.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="somang-home">
        <section className="home-hero" aria-labelledby="home-title">
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
                  <Search aria-hidden="true" size={18} strokeWidth={1.7} />
                  추모관 찾기
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
                </Link>
                <Link
                  href="/memorial/create"
                  className="home-button home-button-secondary"
                >
                  <Plus aria-hidden="true" size={18} strokeWidth={1.7} />
                  추모관 만들기
                </Link>
              </div>
              <Link
                href="/login?redirect=/my/find-parent&mode=signup"
                className="home-parent-link"
              >
                <HeartHandshake
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                />
                우리 부모님 찾기
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className="home-hero-visual" aria-hidden="true">
              <div className="home-hero-image">
                <img
                  src="/hero-somang-chapel-v1.jpg"
                  alt=""
                  width={1672}
                  height={941}
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <div className="home-hero-image-caption">
                <span>SOMANG MEMORIAL</span>
                <span className="home-hero-caption-line" />
                <span>삶과 신앙의 기억</span>
              </div>
            </div>
          </div>

          <div className="home-hero-bottom">
            <a href="#memorials">
              함께 간직하는 기억
              <ArrowDown aria-hidden="true" size={15} strokeWidth={1.5} />
            </a>
            <span aria-hidden="true">가족과 교회, 그리고 다음 세대</span>
          </div>
        </section>

        <HomeSections />
      </main>

      <Footer />
    </div>
  );
}
