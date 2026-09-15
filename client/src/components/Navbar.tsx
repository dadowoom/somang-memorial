import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ORG_INFO } from "@/lib/orgInfo";
import { ArrowRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import "./siteChrome.css";

const menus = {
  memorial: {
    label: "추모관",
    eyebrow: "MEMORIAL",
    title: "기억을 잇는 공간",
    description:
      "한 성도의 삶과 신앙을 돌아보고, 가족과 교회가 함께 믿음의 유산을 이어갑니다.",
    links: [
      {
        href: "/memorial/search",
        label: "추모관 찾기",
        description: "그리운 분의 성함으로 찾아보세요.",
      },
      {
        href: "/memorial/create",
        label: "추모관 만들기",
        description: "사진과 글로 한 성도의 삶과 믿음을 남깁니다.",
      },
      {
        href: "/login?redirect=/my/find-parent&mode=signup",
        label: "우리 부모님 찾기",
        description: "가족의 추모관과 연결합니다.",
      },
    ],
  },
};
type MenuKey = keyof typeof menus;

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const isHome = location === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const menuButtons = useRef<
    Partial<Record<MenuKey, HTMLButtonElement | null>>
  >({});
  const mobileButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const closeMenus = () => {
    setMobileOpen(false);
    setActiveMenu(null);
  };
  useEffect(closeMenus, [location]);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setMobileOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [mobileOpen]);
  const menuTrigger = (key: MenuKey) => (
    <button
      ref={element => {
        menuButtons.current[key] = element;
      }}
      type="button"
      className="site-nav__link"
      aria-expanded={activeMenu === key}
      aria-controls="site-mega-menu"
      onClick={event => {
        const isMouse =
          "pointerType" in event.nativeEvent &&
          event.nativeEvent.pointerType === "mouse";
        setMobileOpen(false);
        setActiveMenu(current => (!isMouse && current === key ? null : key));
      }}
      onPointerEnter={event => {
        if (event.pointerType === "mouse") {
          setMobileOpen(false);
          setActiveMenu(key);
        }
      }}
    >
      {menus[key].label}
      <ChevronDown size={12} aria-hidden="true" />
    </button>
  );
  return (
    <header
      ref={header}
      className={`site-header ${isHome ? "site-header--home" : "site-header--compact"}`}
      onMouseLeave={() => setActiveMenu(null)}
      onBlur={event => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          closeMenus();
      }}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        if (activeMenu) menuButtons.current[activeMenu]?.focus();
        else if (mobileOpen) mobileButton.current?.focus();
        closeMenus();
      }}
    >
      <div className="site-header__inner">
        <div className="site-header__masthead">
          <p className="site-header__intro">소망교회 온라인 추모관</p>
          <Link href="/" className="site-brand" onClick={closeMenus}>
            <img
              src={ORG_INFO.logoSrc}
              alt="소망교회 로고"
              width={512}
              height={372}
            />
            <span className="site-brand__text">
              <span>소망이 있는 곳</span>
              <span className="site-brand__caption">SOMANG MEMORIAL</span>
            </span>
          </Link>
          <div className="site-header__utility">
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link href="/admin" onClick={closeMenus}>
                    관리자
                  </Link>
                )}
                <Link
                  href="/my/account"
                  onClick={closeMenus}
                  className="site-header__account"
                  title={user?.name || "내 계정"}
                >
                  {user?.name || "내 계정"}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    closeMenus();
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <a
                href={getLoginUrl()}
                onClick={closeMenus}
                className="site-login"
              >
                로그인 <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
          {!isAuthenticated && (
            <a
              href={getLoginUrl()}
              onClick={closeMenus}
              className="site-header__mobile-login site-login"
            >
              로그인
            </a>
          )}
          <button
            ref={mobileButton}
            type="button"
            className="site-header__toggle"
            onClick={() => {
              setMobileOpen(open => !open);
              setActiveMenu(null);
            }}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        <nav className="site-nav" aria-label="주요 메뉴">
          <Link
            href="/somang-hill"
            className="site-nav__link"
            onPointerEnter={() => setActiveMenu(null)}
          >
            소망동산
          </Link>
          {menuTrigger("memorial")}
          <Link
            href="/letters"
            className="site-nav__link"
            onPointerEnter={() => setActiveMenu(null)}
          >
            하늘로 보내는 편지
          </Link>
          <Link
            href="/guide"
            className="site-nav__link"
            onPointerEnter={() => setActiveMenu(null)}
            aria-current={location === "/guide" ? "page" : undefined}
          >
            이용 안내
          </Link>
          {isAuthenticated && (
            <Link
              href="/my/memorials"
              className="site-nav__link"
              onPointerEnter={() => setActiveMenu(null)}
            >
              내 추모관
            </Link>
          )}
          <Link
            href="/memorial/search"
            className="site-nav__search"
            onPointerEnter={() => setActiveMenu(null)}
          >
            <Search size={16} aria-hidden="true" /> 추모관 찾기
          </Link>
          <a
            className={`site-nav__account${isAuthenticated ? "" : " site-login"}`}
            href={isAuthenticated ? "/my/account" : getLoginUrl()}
          >
            {isAuthenticated ? "내 계정" : "로그인"}
          </a>
        </nav>
      </div>
      {activeMenu && (
        <div
          id="site-mega-menu"
          className="site-mega"
          aria-label={`${menus[activeMenu].label} 메뉴`}
        >
          <div className="site-mega__inner">
            <div className="site-mega__intro">
              <p>{menus[activeMenu].eyebrow}</p>
              <h2>{menus[activeMenu].title}</h2>
              <span>{menus[activeMenu].description}</span>
            </div>
            <div className="site-mega__links">
              {menus[activeMenu].links.map(link => (
                <a
                  key={link.href}
                  href={
                    isAuthenticated && link.href.includes("/my/find-parent")
                      ? "/my/find-parent"
                      : link.href
                  }
                  onClick={closeMenus}
                >
                  <span>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                  </span>
                  <ArrowRight size={22} strokeWidth={1.2} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {mobileOpen && (
        <nav
          id="site-mobile-menu"
          className="site-mobile"
          aria-label="전체 메뉴"
        >
          <p className="site-mobile__eyebrow">전체 메뉴</p>
          <div className="site-mobile__links">
            {[
              { href: "/somang-hill", label: "소망동산" },
              { href: "/memorial/search", label: "추모관 찾기" },
              { href: "/memorial/create", label: "추모관 만들기" },
              { href: "/letters", label: "하늘로 보내는 편지" },
              { href: "/guide", label: "이용 안내" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                aria-current={location === link.href ? "page" : undefined}
              >
                {link.label}
                <ArrowRight size={18} strokeWidth={1.4} aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="site-mobile__account">
            {isAuthenticated ? (
              <>
                <Link href="/my/memorials" onClick={closeMenus}>
                  내 추모관
                </Link>
                <Link href="/my/find-parent" onClick={closeMenus}>
                  우리 부모님 찾기
                </Link>
                <Link href="/my/account" onClick={closeMenus}>
                  내 계정
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" onClick={closeMenus}>
                    관리자
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    closeMenus();
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <div className="site-mobile__welcome">
                <p>소중한 기억을 남겨 보세요.</p>
                <a
                  href={getLoginUrl()}
                  onClick={closeMenus}
                  className="site-mobile__login"
                >
                  로그인 <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
