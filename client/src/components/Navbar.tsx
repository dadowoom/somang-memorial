import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Menu, Plus, Search, X } from "lucide-react";
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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#dbdad7] bg-white/95 backdrop-blur">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center bg-[#18181b] text-white">
                <Plus className="h-4 w-4" strokeWidth={1.7} />
              </span>
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
          </Link>

          <nav className="hidden items-center gap-5 md:flex lg:gap-8">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-[#616161] transition-colors hover:text-[#121212]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/memorial/search">
              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#dbdad7] bg-white px-4 text-xs font-medium text-[#121212] transition-colors hover:bg-[#f6f5f2]">
                <Search className="h-3.5 w-3.5" />
                추모관
              </button>
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/">
                  <span className="text-sm text-[#616161] transition-colors hover:text-[#121212]">
                    {user?.name || "계정"}
                  </span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="h-9 border border-[#dbdad7] bg-white px-4 text-xs font-medium text-[#616161] transition-colors hover:bg-[#f6f5f2] hover:text-[#121212]"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <button className="h-9 bg-[#18181b] px-4 text-xs font-medium text-white transition-opacity hover:opacity-90">
                  로그인
                </button>
              </a>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-[#dbdad7] bg-white text-[#121212] md:hidden"
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
        <div className="border-t border-[#dbdad7] bg-white md:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="py-3 text-sm text-[#121212]"
              >
                {item.label}
              </a>
            ))}
            <Link href="/memorial/search">
              <span
                onClick={closeMobile}
                className="py-3 text-sm text-[#121212]"
              >
                추모관
              </span>
            </Link>
            <Link href="/memorial/create">
              <span
                onClick={closeMobile}
                className="py-3 text-sm text-[#121212]"
              >
                소망 만들기
              </span>
            </Link>
            <div className="mt-3 border-t border-[#dbdad7] pt-4">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    closeMobile();
                  }}
                  className="h-10 w-full border border-[#dbdad7] bg-white text-sm text-[#121212]"
                >
                  로그아웃
                </button>
              ) : (
                <a href={getLoginUrl()} onClick={closeMobile}>
                  <button className="h-10 w-full bg-[#18181b] text-sm font-medium text-white">
                    로그인
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
