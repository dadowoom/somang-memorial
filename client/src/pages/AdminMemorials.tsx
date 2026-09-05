import { useAuth } from "@/_core/hooks/useAuth";
import { formatLifespan } from "@/lib/lifespan";
import AdminNavigation from "@/components/admin/AdminNavigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { downloadCsv } from "@/lib/csvExport";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bell,
  Download,
  Edit3,
  Eye,
  LockKeyhole,
  Mail,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type AdminMemorial = {
  id: number;
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  familyContact: string | null;
  familyPhone: string | null;
  visibility: string;
  status: string;
  memorialDay: string | null;
  updatedAt: Date;
  href: string;
  editHref: string;
};

type MemorialStatus = "pending" | "published" | "private";
type MemorialStatusFilter = "all" | MemorialStatus;

const statusLabels: Record<MemorialStatus, string> = {
  pending: "검토 대기",
  published: "게시 중",
  private: "비공개 보관",
};

type AdminLetter = { status: "published" | "hidden" };
type AdminUser = { approvalStatus: "pending" | "approved" | "rejected" };
type AdminReminder = { status: "active" | "cancelled" };

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function AdminMemorials() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MemorialStatusFilter>("all");
  const [statusError, setStatusError] = useState("");
  const utils = trpc.useUtils();
  const memorialsQuery = trpc.memorial.adminList.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const lettersQuery = trpc.letter.adminList.useQuery(
    { limit: 300 },
    { enabled: user?.role === "admin" }
  );
  const usersQuery = trpc.admin.users.useQuery(
    { limit: 500 },
    { enabled: user?.role === "admin" }
  );
  const remindersQuery = trpc.reminder.adminList.useQuery(
    { limit: 300 },
    { enabled: user?.role === "admin" }
  );
  const smsStatusQuery = trpc.reminder.smsStatus.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  // Publishing from the list keeps the daily review in one screen. Only the
  // publication status is sent, so visibility and the access password stay
  // exactly as the family set them.
  const updateStatus = trpc.memorial.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.memorial.adminList.invalidate(),
        utils.memorial.list.invalidate(),
        utils.memorial.search.invalidate(),
      ]);
    },
    onError: error => setStatusError(error.message),
  });
  const memorials = (memorialsQuery.data ?? []) as AdminMemorial[];
  const letters = (lettersQuery.data ?? []) as AdminLetter[];
  const users = (usersQuery.data ?? []) as AdminUser[];
  const reminders = (remindersQuery.data ?? []) as AdminReminder[];
  const keyword = query.trim().toLowerCase();

  const filteredMemorials = useMemo(() => {
    return memorials.filter(memorial => {
      const matchesStatus =
        statusFilter === "all" || memorial.status === statusFilter;
      const matchesKeyword =
        !keyword ||
        [
          memorial.name,
          memorial.role,
          memorial.church,
          memorial.slug,
          memorial.familyContact ?? "",
          memorial.familyPhone ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, memorials, statusFilter]);

  const publishedCount = memorials.filter(
    memorial => memorial.status === "published"
  ).length;
  const pendingCount = memorials.filter(
    memorial => memorial.status === "pending"
  ).length;
  const privateCount = memorials.filter(
    memorial => memorial.status === "private"
  ).length;
  const pendingLetters = letters.filter(letter => letter.status === "hidden").length;
  const pendingUsers = users.filter(
    account => account.approvalStatus === "pending"
  ).length;
  const activeReminders = reminders.filter(
    reminder => reminder.status === "active"
  ).length;

  function changeStatus(memorial: AdminMemorial, nextStatus: MemorialStatus) {
    if (nextStatus === memorial.status) return;

    // A published memorial still stays out of public search while its
    // visibility is private, so the administrator is told before confirming.
    const privateNotice =
      nextStatus === "published" && memorial.visibility === "private"
        ? "\n\n공개 범위가 '비공개'이므로 일반 검색에는 나타나지 않습니다. 검색에도 보이게 하려면 수정 화면에서 공개 범위를 함께 바꿔 주세요."
        : "";

    if (
      !window.confirm(
        `${memorial.name} ${memorial.role} 추모관을 '${statusLabels[nextStatus]}'(으)로 바꾸시겠습니까?${privateNotice}`
      )
    )
      return;

    setStatusError("");
    updateStatus.mutate({ id: memorial.id, status: nextStatus });
  }

  if (loading) {
    return <StateScreen text="관리자 권한을 확인하고 있습니다." />;
  }

  if (user?.role !== "admin") {
    return <StateScreen text="관리자만 접근할 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16 lg:pl-60">
        <AdminNavigation />
        <section className="border-b border-[#b5b0a7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Admin
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={serifStyle}
              >
                추모관 관리
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#616161]">
                등록된 추모관을 확인하고, 기본 정보와 공개 설정을 조용히
                정리합니다.
              </p>
            </div>

            <div className="grid gap-px border border-[#b5b0a7] bg-[#b5b0a7] sm:grid-cols-4">
              <Stat label="전체" value={`${memorials.length}`} />
              <Stat label="검토 대기" value={`${pendingCount}`} />
              <Stat label="게시 중" value={`${publishedCount}`} />
              <Stat label="비공개 보관" value={`${privateCount}`} />
            </div>
          </div>
        </section>

        <section className="border-b border-[#b5b0a7] bg-[#f7f7f7] py-8 md:py-10">
          <div className="container">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#777]">
                  Daily overview
                </p>
                <h2 className="mt-2 text-2xl font-normal" style={serifStyle}>
                  오늘 확인할 일
                </h2>
              </div>
              <Link href="/admin/operations">
                <button className="inline-flex h-10 items-center gap-2 border border-[#b5b0a7] bg-white px-4 text-sm text-[#121212] transition-colors hover:bg-[#efefef]">
                  운영 관리 열기
                  <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
                </button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className="min-h-40 border border-[#b5b0a7] bg-white p-5 text-left transition-colors hover:bg-[#fafafa]"
              >
                <span className="flex items-center justify-between text-[#616161]">
                  <LockKeyhole className="h-4 w-4" />
                  <span className="text-2xl font-light text-[#121212]">
                    {pendingCount}
                  </span>
                </span>
                <strong className="mt-8 block text-base font-medium">
                  검토 대기 추모관
                </strong>
                <span className="mt-2 block text-sm leading-6 text-[#616161]">
                  눌러서 대기 목록만 확인합니다.
                </span>
              </button>

              <Link href="/admin/operations">
                <button className="min-h-40 w-full border border-[#b5b0a7] bg-white p-5 text-left transition-colors hover:bg-[#fafafa]">
                  <span className="flex items-center justify-between text-[#616161]">
                    <Mail className="h-4 w-4" />
                    <span className="text-2xl font-light text-[#121212]">
                      {pendingLetters}
                    </span>
                  </span>
                  <strong className="mt-8 block text-base font-medium">
                    검토 대기 편지
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-[#616161]">
                    공개 전 내용을 확인합니다.
                  </span>
                </button>
              </Link>

              <Link href="/admin/users">
                <button className="min-h-40 w-full border border-[#b5b0a7] bg-white p-5 text-left transition-colors hover:bg-[#fafafa]">
                  <span className="flex items-center justify-between text-[#616161]">
                    <UsersRound className="h-4 w-4" />
                    <span className="text-2xl font-light text-[#121212]">
                      {pendingUsers}
                    </span>
                  </span>
                  <strong className="mt-8 block text-base font-medium">
                    가입 확인 대기
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-[#616161]">
                    새 가입자 상태를 처리합니다.
                  </span>
                </button>
              </Link>

              <Link href="/admin/operations">
                <button className="min-h-40 w-full border border-[#b5b0a7] bg-white p-5 text-left transition-colors hover:bg-[#fafafa]">
                  <span className="flex items-center justify-between text-[#616161]">
                    <Bell className="h-4 w-4" />
                    <span className="text-right text-2xl font-light text-[#121212]">
                      {activeReminders}
                    </span>
                  </span>
                  <strong className="mt-8 block text-base font-medium">
                    추도일 알림 신청
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-[#616161]">
                    문자 기능 {smsStatusQuery.data?.enabled ? "정상" : "설정 확인 필요"}
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
              <label className="flex min-w-0 items-center gap-3 border border-[#b5b0a7] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-[#616161]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="성함, 직분, 교회, 연락처로 찾기"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9a9a]"
                />
              </label>

              <select
                aria-label="게시 상태 필터"
                value={statusFilter}
                onChange={event =>
                  setStatusFilter(event.target.value as MemorialStatusFilter)
                }
                className="h-12 border border-[#b5b0a7] bg-white px-4 text-sm text-[#121212] outline-none focus:border-[#18181b]"
              >
                <option value="all">모든 상태</option>
                <option value="pending">검토 대기</option>
                <option value="published">게시 중</option>
                <option value="private">비공개 보관</option>
              </select>

              <button
                type="button"
                onClick={() => exportMemorials(filteredMemorials)}
                className="inline-flex h-12 items-center justify-center gap-2 border border-[#b5b0a7] bg-white px-5 text-sm text-[#121212] transition-colors hover:bg-[#f5f5f5]"
              >
                <Download className="h-4 w-4" strokeWidth={1.7} />
                CSV
              </button>

              <Link href="/memorial/create">
                <button className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90">
                  <Plus className="h-4 w-4" strokeWidth={1.7} />
                  새 추모관
                </button>
              </Link>
            </div>

            {statusError && (
              <p
                role="alert"
                className="mb-4 border border-[#e3c9c9] bg-[#fbf5f5] px-4 py-3 text-sm leading-6 text-[#9f2a2a]"
              >
                게시 상태를 바꾸지 못했습니다. {statusError}
              </p>
            )}

            {memorialsQuery.isLoading ? (
              <Panel text="추모관 목록을 불러오고 있습니다." />
            ) : memorialsQuery.isError ? (
              <Panel text="목록을 불러오지 못했습니다." />
            ) : filteredMemorials.length === 0 ? (
              <Panel text="조건에 맞는 추모관이 없습니다." />
            ) : (
              <div className="overflow-hidden border-y border-[#b5b0a7]">
                <div className="hidden grid-cols-[150px_1.1fr_0.9fr_0.8fr_0.8fr_300px] border-b border-[#b5b0a7] bg-[#f7f7f7] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777] lg:grid">
                  <span>Year</span>
                  <span>Name</span>
                  <span>Church</span>
                  <span>Visibility</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-[#b5b0a7]">
                  {filteredMemorials.map(memorial => (
                    <article
                      key={memorial.id}
                      className="grid gap-4 bg-white px-4 py-5 transition-colors hover:bg-[#fafafa] lg:grid-cols-[150px_1.1fr_0.9fr_0.8fr_0.8fr_300px] lg:items-center lg:px-5"
                    >
                      <p className="text-xs tracking-[0.1em] text-[#616161] md:text-sm">
                        {formatLifespan(memorial.birthDate, memorial.deathDate)}
                      </p>

                      <div>
                        <h2
                          className="text-2xl font-normal lg:text-xl"
                          style={serifStyle}
                        >
                          {memorial.name}
                        </h2>
                        <p className="mt-1 text-sm text-[#616161]">
                          {memorial.role}
                        </p>
                      </div>

                      <p className="text-sm text-[#616161]">
                        {memorial.church}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <VisibilityBadge visibility={memorial.visibility} />
                        <MemorialStatusBadge status={memorial.status} />
                      </div>

                      <p className="text-sm text-[#616161]">
                        {formatDate(memorial.updatedAt)}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <label
                          className="sr-only"
                          htmlFor={`memorial-status-${memorial.id}`}
                        >
                          {memorial.name} 게시 상태
                        </label>
                        <select
                          id={`memorial-status-${memorial.id}`}
                          value={memorial.status}
                          disabled={updateStatus.isPending}
                          onChange={event =>
                            changeStatus(
                              memorial,
                              event.target.value as MemorialStatus
                            )
                          }
                          className="h-10 border border-[#b5b0a7] bg-white px-3 text-sm text-[#121212] outline-none focus:border-[#18181b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="pending">검토 대기</option>
                          <option value="published">게시 중</option>
                          <option value="private">비공개 보관</option>
                        </select>

                        <Link href={memorial.editHref}>
                          <button className="inline-flex h-10 items-center justify-center gap-2 border border-[#18181b] px-4 text-sm text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white">
                            <Edit3 className="h-4 w-4" strokeWidth={1.7} />
                            수정
                          </button>
                        </Link>
                        <Link href={memorial.href}>
                          <button className="inline-flex h-10 items-center justify-center gap-2 border border-[#b5b0a7] px-4 text-sm text-[#121212] transition-colors hover:bg-white">
                            <Eye className="h-4 w-4" strokeWidth={1.7} />
                            보기
                            <ArrowRight
                              className="h-4 w-4"
                              strokeWidth={1.7}
                            />
                          </button>
                        </Link>
                      </div>
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

function exportMemorials(memorials: AdminMemorial[]) {
  downloadCsv("somang-memorials.csv", memorials, [
    { label: "성함", value: row => row.name },
    { label: "직분", value: row => row.role },
    { label: "출생일", value: row => row.birthDate },
    { label: "소천일", value: row => row.deathDate },
    { label: "교회", value: row => row.church },
    { label: "가족대표", value: row => row.familyContact },
    { label: "가족연락처", value: row => row.familyPhone },
    { label: "공개설정", value: row => row.visibility },
    { label: "상태", value: row => row.status },
    { label: "추도일", value: row => row.memorialDay },
    { label: "주소", value: row => row.href },
    { label: "수정일", value: row => formatDate(row.updatedAt) },
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

function VisibilityBadge({ visibility }: { visibility: string }) {
  const privateMemorial = visibility === "private";
  return (
    <span className="inline-flex w-fit items-center gap-1 border border-[#b5b0a7] px-2 py-1 text-xs text-[#616161]">
      {privateMemorial && <LockKeyhole className="h-3 w-3" />}
      {privateMemorial ? "비공개" : "전체 공개"}
    </span>
  );
}

function MemorialStatusBadge({ status }: { status: string }) {
  const label = statusLabels[status as MemorialStatus] ?? "비공개 보관";

  return (
    <span className="inline-flex w-fit items-center border border-[#b5b0a7] bg-[#f7f7f7] px-2 py-1 text-xs text-[#616161]">
      {label}
    </span>
  );
}

function Panel({ text }: { text: string }) {
  return (
    <div className="border border-[#b5b0a7] py-20 text-center">
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
