import {
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  Plus,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navigationItems = [
  {
    href: "/admin",
    label: "추모관 관리",
    description: "검토 · 공개 설정",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/operations",
    label: "운영 관리",
    description: "편지 · 추도일 알림",
    icon: ClipboardList,
  },
  {
    href: "/admin/users",
    label: "회원 관리",
    description: "권한 · 이용 상태",
    icon: UsersRound,
  },
];

export default function AdminNavigation() {
  const [location] = useLocation();

  const isActive = (href: string) =>
    location === href ||
    (href !== "/admin" && location.startsWith(`${href}/`));

  return (
    <>
      <aside className="fixed inset-y-16 left-0 z-40 hidden w-60 border-r border-[#b5b0a7] bg-[#faf9f6] lg:flex lg:flex-col">
        <div className="border-b border-[#b5b0a7] px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-[#18181b] text-white">
              <Plus className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-medium text-[#121212]">관리자 운영센터</p>
              <p className="mt-0.5 text-[10px] tracking-[0.14em] text-[#777]">
                SOMANG MEMORIAL
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="관리자 메뉴" className="flex-1 px-3 py-4">
          <p className="px-3 pb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#777]">
            관리 메뉴
          </p>
          <div className="space-y-1">
            {navigationItems.map(item => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`flex min-h-16 items-center gap-3 px-3 py-3 transition-colors ${
                      active
                        ? "bg-[#18181b] text-white"
                        : "text-[#454545] hover:bg-white hover:text-[#121212]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span
                        className={`mt-1 block text-[11px] ${
                          active ? "text-white/65" : "text-[#8a8a8a]"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#b5b0a7] p-3">
          <Link href="/">
            <span className="flex h-10 items-center justify-between px-3 text-xs text-[#616161] transition-colors hover:bg-white hover:text-[#121212]">
              웹사이트 보기
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </aside>

      <nav
        aria-label="관리자 메뉴"
        className="border-b border-[#b5b0a7] bg-[#faf9f6] lg:hidden"
      >
        <div className="container flex min-h-12 items-center gap-1 overflow-x-auto py-2">
          <span className="mr-2 shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777]">
            Admin
          </span>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`inline-flex h-9 items-center gap-2 whitespace-nowrap px-3 text-sm transition-colors ${
                    active
                      ? "bg-[#18181b] text-white"
                      : "text-[#616161] hover:bg-white hover:text-[#121212]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
