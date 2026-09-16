import { ORG_INFO } from "@/lib/orgInfo";
import { Link } from "wouter";
import "./siteChrome.css";

const serviceLinks = [
  { label: "추모관 찾기", href: "/memorial/search", type: "route" },
  {
    label: "우리 부모님 찾기",
    href: "/login?redirect=/my/find-parent&mode=signup",
    type: "route",
  },
  { label: "추모관 만들기", href: "/memorial/create", type: "route" },
  { label: "이용 안내", href: "/guide", type: "route" },
];

export default function Footer() {
  return (
    <footer className="site-footer border-t border-[#b5b0a7] bg-white text-[#616161]">
      <div className="container py-12 md:py-16">
        <div className="site-footer__grid grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <img
                src={ORG_INFO.logoSrc}
                alt="소망교회 로고"
                width={512}
                height={372}
                className="h-8 w-auto"
              />
              <div className="leading-tight">
                <span
                  className="block text-sm font-normal text-[#121212]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  소망이 있는 곳
                </span>
                <span className="block text-[10px] tracking-[0.16em] text-[#616161]">
                  소망교회 추모관
                </span>
              </div>
            </div>
            <p className="max-w-sm break-keep text-sm leading-7 [overflow-wrap:anywhere]">
              한 성도의 삶과 믿음을 가족과 교회가 함께 기억하고, 다음 세대에 전합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-medium tracking-[0.22em] text-[#121212] uppercase">
              이용 안내
            </h2>
            <ul className="site-footer__links text-sm">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  {link.type === "route" ? (
                    <Link href={link.href}>
                      <span className="block cursor-pointer py-2 transition-colors hover:text-[#121212]">
                        {link.label}
                      </span>
                    </Link>
                  ) : (
                    <a href={link.href} className="block py-2 transition-colors hover:text-[#121212]">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-medium tracking-[0.22em] text-[#121212] uppercase">
              {ORG_INFO.name}
            </h2>
            <ul className="text-sm">
              <li>{ORG_INFO.address}</li>
              <li>온라인 추모관</li>
              <li>
                <a href={`tel:${ORG_INFO.contactPhone}`}>
                  {ORG_INFO.contactPhoneLabel} {ORG_INFO.contactPhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[#b5b0a7] pt-6 text-xs md:flex-row">
          <p>© 2026 {ORG_INFO.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-medium text-[#121212] transition-colors hover:text-[#616161]"
            >
              개인정보처리방침
            </Link>
            <span aria-hidden="true" className="text-[#b5b0a7]">
              |
            </span>
            <Link
              href="/terms"
              className="transition-colors hover:text-[#121212]"
            >
              이용약관
            </Link>
          </div>
        </div>
        <div className="site-footer__admin">
          <Link href="/login?redirect=/admin">관리자 로그인</Link>
        </div>
      </div>
    </footer>
  );
}
