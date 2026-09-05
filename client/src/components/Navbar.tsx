import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ORG_INFO } from "@/lib/orgInfo";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const navItems = [
  { label: "소망동산", href: "/somang-hill" },
  { label: "추모관", href: "/memorial/search" },
  { label: "하늘로 보내는 편지", href: "/letters" },
  { label: "서비스", href: "/#services" },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#b5b0a7] bg-white/95 backdrop-blur">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-3">
              <img
                src={ORG_INFO.logoSrc}
                alt="소망교회 로고"
                width={512}
                height={372}
                className="h-8 w-auto"
              />
              <div className="leading-tight">
                <span
                  className="block text-base font-medium text-[#121212]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  소망이 있는 곳
                </span>
                <span className="block text-[11px] tracking-[0.14em] text-[#5a5a5a]">
                  소망교회 추모관
                </span>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 md:flex lg:gap-8">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="text-[15px] font-medium text-[#3f3f3f] transition-colors hover:text-[#121212]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link href="/memorial/search">
              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#b5b0a7] bg-white px-4 text-sm font-medium text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                <Search className="h-3.5 w-3.5" />
                추모관
              </button>
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/my/memorials">
                  <span className="text-[15px] font-medium text-[#3f3f3f] transition-colors hover:text-[#121212]">
                    내 추모관
                  </span>
                </Link>
                <Link href="/my/find-parent">
                  <span className="text-[15px] font-medium text-[#3f3f3f] transition-colors hover:text-[#121212]">
                    내 부모 찾기
                  </span>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <button className="h-9 border border-[#18181b] bg-[#18181b] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90">
                      관리자
                    </button>
                  </Link>
                )}
                <Link href="/my/account">
                  <span className="text-[15px] font-medium text-[#3f3f3f] transition-colors hover:text-[#121212]">
                    {user?.name || "계정"}
                  </span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="h-9 border border-[#b5b0a7] bg-white px-4 text-sm font-medium text-[#616161] transition-colors hover:bg-[#f5f5f5] hover:text-[#121212]"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login?redirect=/admin">
                  <button className="h-9 border border-[#b5b0a7] bg-white px-4 text-sm font-medium text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                    관리자 로그인
                  </button>
                </Link>
                <a href={getLoginUrl()}>
                  <button className="h-9 bg-[#18181b] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90">
                    로그인
                  </button>
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-[#b5b0a7] bg-white text-[#121212] xl:hidden"
            onClick={() => setMobileOpen(open => !open)}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#b5b0a7] bg-white xl:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="block py-3 text-[15px] font-medium text-[#121212]"
              >
                {item.label}
              </a>
            ))}
            <Link href="/memorial/create">
              <span
                onClick={closeMobile}
                className="block py-3 text-[15px] font-medium text-[#121212]"
              >
                소망 만들기
              </span>
            </Link>
            {isAuthenticated && (
              <Link href="/my/memorials">
                <span
                  onClick={closeMobile}
                  className="block py-3 text-[15px] font-medium text-[#121212]"
                >
                  내 추모관
                </span>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/my/find-parent">
                <span
                  onClick={closeMobile}
                  className="block py-3 text-[15px] font-medium text-[#121212]"
                >
                  내 부모 찾기
                </span>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin">
                <span
                  onClick={closeMobile}
                  className="block py-3 text-sm font-medium text-[#121212]"
                >
                  관리자
                </span>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/my/account">
                <span
                  onClick={closeMobile}
                  className="block py-3 text-sm font-medium text-[#121212]"
                >
                  내 계정
                </span>
              </Link>
            )}
            <div className="mt-3 border-t border-[#b5b0a7] pt-4">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    closeMobile();
                  }}
                  className="h-10 w-full border border-[#b5b0a7] bg-white text-sm text-[#121212]"
                >
                  로그아웃
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login?redirect=/admin" onClick={closeMobile}>
                    <button className="h-10 w-full border border-[#b5b0a7] bg-white text-sm font-medium text-[#121212]">
                      관리자 로그인
                    </button>
                  </Link>
                  <a href={getLoginUrl()} onClick={closeMobile}>
                    <button className="h-10 w-full bg-[#18181b] text-sm font-medium text-white">
                      로그인
                    </button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
