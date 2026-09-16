import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import GuideContent from "@/components/guide/GuideContent";
import "./guide.css";

// 본문은 GuideContent 에 있다. 키오스크 "이용 안내" 창도 같은 본문을 쓴다 (2026-09-16).
export default function Guide() {
  return (
    <div className="guide-page">
      <Navbar />
      <GuideContent variant="web" />
      <Footer />
    </div>
  );
}
