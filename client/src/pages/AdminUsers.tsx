import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { downloadCsv } from "@/lib/csvExport";
import { trpc } from "@/lib/trpc";
import { Download, Search, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  approvalStatus: "pending" | "approved" | "rejected";
  approvedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSignedIn: Date | string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function AdminUsers() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [query, setQuery] = useState("");
  const usersQuery = trpc.admin.users.useQuery(
    { limit: 500 },
    { enabled: user?.role === "admin" }
  );
  const users = (usersQuery.data ?? []) as AdminUser[];
  const keyword = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!keyword) return users;
    return users.filter(item =>
      [
        item.name ?? "",
        item.email ?? "",
        item.phone ?? "",
        item.role,
        item.loginMethod ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [keyword, users]);

  const adminCount = users.filter(item => item.role === "admin").length;
  const localCount = users.filter(item => item.loginMethod === "local").length;

  if (loading) return <StateScreen text="관리자 권한을 확인하고 있습니다." />;
  if (user?.role !== "admin") {
    return <StateScreen text="관리자만 접근할 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="pt-16">
        <section className="border-b border-[#dbdad7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Admin Users
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={serifStyle}
              >
                회원 관리
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#616161]">
                가입한 성도와 관리자 계정을 확인하고 운영에 필요한 연락처를
                정리합니다.
              </p>
            </div>

            <div className="grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-3">
              <Stat label="전체 회원" value={`${users.length}`} />
              <Stat label="관리자" value={`${adminCount}`} />
              <Stat label="일반 가입" value={`${localCount}`} />
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <label className="flex min-w-0 items-center gap-3 border border-[#dbdad7] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-[#616161]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="이름, 이메일, 연락처로 찾기"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9a9a]"
                />
              </label>

              <button
                type="button"
                onClick={() => exportUsers(filteredUsers)}
                className="inline-flex h-12 items-center justify-center gap-2 border border-[#dbdad7] bg-white px-5 text-sm text-[#121212] transition-colors hover:bg-[#f6f5f2]"
              >
                <Download className="h-4 w-4" strokeWidth={1.7} />
                CSV
              </button>

              <Link href="/admin">
                <button className="h-12 border border-[#18181b] px-5 text-sm text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white">
                  추모관 관리
                </button>
              </Link>
            </div>

            {usersQuery.isLoading ? (
              <Panel text="회원 목록을 불러오고 있습니다." />
            ) : usersQuery.isError ? (
              <Panel text="회원 목록을 불러오지 못했습니다." />
            ) : filteredUsers.length === 0 ? (
              <Panel text="조건에 맞는 회원이 없습니다." />
            ) : (
              <div className="overflow-hidden border-y border-[#dbdad7]">
                <div className="hidden grid-cols-[1.1fr_1.3fr_0.8fr_0.75fr_0.8fr_0.85fr] border-b border-[#dbdad7] bg-[#f8f7f4] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777] lg:grid">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Phone</span>
                  <span>Role</span>
                  <span>Joined</span>
                  <span>Last Login</span>
                </div>

                <div className="divide-y divide-[#dbdad7]">
                  {filteredUsers.map(item => (
                    <article
                      key={item.id}
                      className="grid gap-3 bg-white px-4 py-5 transition-colors hover:bg-[#faf9f6] lg:grid-cols-[1.1fr_1.3fr_0.8fr_0.75fr_0.8fr_0.85fr] lg:items-center lg:px-5"
                    >
                      <div className="flex items-center gap-2">
                        {item.role === "admin" ? (
                          <ShieldCheck className="h-4 w-4 text-[#121212]" />
                        ) : (
                          <UserRound className="h-4 w-4 text-[#777]" />
                        )}
                        <span className="text-sm font-medium">
                          {item.name || "이름 없음"}
                        </span>
                      </div>
                      <p className="break-all text-sm text-[#616161]">
                        {item.email || "-"}
                      </p>
                      <p className="text-sm text-[#616161]">
                        {formatPhone(item.phone || "") || "-"}
                      </p>
                      <RoleBadge role={item.role} />
                      <p className="text-sm text-[#616161]">
                        {formatDate(item.createdAt)}
                      </p>
                      <p className="text-sm text-[#616161]">
                        {formatDate(item.lastSignedIn)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function exportUsers(users: AdminUser[]) {
  downloadCsv("somang-users.csv", users, [
    { label: "이름", value: row => row.name },
    { label: "이메일", value: row => row.email },
    { label: "연락처", value: row => row.phone },
    { label: "권한", value: row => row.role },
    { label: "가입방식", value: row => row.loginMethod },
    { label: "가입일", value: row => formatDate(row.createdAt) },
    { label: "최근로그인", value: row => formatDate(row.lastSignedIn) },
  ]);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <p className="text-xs text-[#616161]">{label}</p>
      <p className="mt-3 text-2xl font-light text-[#121212]">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex w-fit border border-[#dbdad7] px-2 py-1 text-xs text-[#616161]">
      {role === "admin" ? "관리자" : "회원"}
    </span>
  );
}

function Panel({ text }: { text: string }) {
  return (
    <div className="border border-[#dbdad7] py-20 text-center">
      <p className="text-sm text-[#616161]">{text}</p>
    </div>
  );
}

function StateScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="container pt-32">
        <Panel text={text} />
      </main>
    </div>
  );
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return value;
}
