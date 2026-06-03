import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Edit3,
  Eye,
  Globe2,
  LockKeyhole,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

type MyMemorial = {
  id: number;
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  visibility: string;
  status: string;
  memorialDay: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  href: string;
  editHref: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function MyMemorials() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const memorialsQuery = trpc.memorial.mine.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const memorials = (memorialsQuery.data ?? []) as MyMemorial[];
  const publicCount = memorials.filter(
    memorial => memorial.visibility === "public"
  ).length;
  const linkCount = memorials.filter(
    memorial => memorial.visibility === "link"
  ).length;
  const privateCount = memorials.filter(
    memorial => memorial.visibility === "private"
  ).length;

  if (loading) {
    return <StateScreen text="계정 정보를 확인하고 있습니다." />;
  }

  if (!user) {
    return <StateScreen text="로그인 후 내 추모관을 확인할 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#dbdad7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                My Memorials
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={serifStyle}
              >
                내 추모관
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#616161]">
                내 계정으로 만든 추모관을 확인하고, 필요한 기본 정보와 공개
                설정을 이어서 정리합니다.
              </p>
            </div>

            <div className="grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-4">
              <Stat label="전체" value={`${memorials.length}`} />
              <Stat label="공개" value={`${publicCount}`} />
              <Stat label="링크" value={`${linkCount}`} />
              <Stat label="비공개" value={`${privateCount}`} />
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-6 flex flex-col gap-4 border-b border-[#dbdad7] pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[#121212]">
                  등록된 추모관
                </p>
                <p className="mt-1 text-xs leading-5 text-[#777]">
                  최근 수정된 순서로 표시됩니다.
                </p>
              </div>
              <Link href="/memorial/create">
                <button className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 md:w-auto">
                  <Plus className="h-4 w-4" strokeWidth={1.7} />
                  소망 만들기
                </button>
              </Link>
            </div>

            {memorialsQuery.isLoading ? (
              <Panel text="내 추모관을 불러오고 있습니다." />
            ) : memorialsQuery.isError ? (
              <Panel text="목록을 불러오지 못했습니다." />
            ) : memorials.length === 0 ? (
              <EmptyPanel />
            ) : (
              <div className="overflow-hidden border-y border-[#dbdad7]">
                <div className="hidden grid-cols-[minmax(210px,1.25fr)_minmax(150px,0.8fr)_minmax(130px,0.65fr)_minmax(150px,0.75fr)_178px] border-b border-[#dbdad7] bg-[#f8f7f4] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777] lg:grid">
                  <span>Name</span>
                  <span>Status</span>
                  <span>Memorial Day</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-[#dbdad7]">
                  {memorials.map(memorial => (
                    <article
                      key={memorial.id}
                      className="grid gap-5 bg-white px-4 py-5 transition-colors hover:bg-[#faf9f6] lg:grid-cols-[minmax(210px,1.25fr)_minmax(150px,0.8fr)_minmax(130px,0.65fr)_minmax(150px,0.75fr)_178px] lg:items-center lg:px-5"
                    >
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
                        <p className="mt-3 text-xs leading-5 text-[#777]">
                          {memorial.birthDate} - {memorial.deathDate}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#777]">
                          {memorial.church}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <VisibilityBadge visibility={memorial.visibility} />
                        <StatusBadge status={memorial.status} />
                      </div>

                      <MetaText
                        icon={<CalendarDays className="h-4 w-4" />}
                        label="추도일"
                        value={formatNullableDate(memorial.memorialDay)}
                      />

                      <div className="grid grid-cols-2 gap-3 border-y border-[#dbdad7] py-4 lg:block lg:border-0 lg:py-0">
                        <MetaText
                          icon={<Clock3 className="h-4 w-4" />}
                          label="최근 수정"
                          value={formatDate(memorial.updatedAt)}
                        />
                        <MetaText
                          label="등록일"
                          value={formatDate(memorial.createdAt)}
                          compact
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link href={memorial.editHref}>
                          <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 border border-[#18181b] px-4 text-sm text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white sm:flex-none">
                            <Edit3 className="h-4 w-4" strokeWidth={1.7} />
                            수정
                          </button>
                        </Link>
                        <Link href={memorial.href}>
                          <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 border border-[#dbdad7] px-4 text-sm text-[#121212] transition-colors hover:bg-white sm:flex-none">
                            <Eye className="h-4 w-4" strokeWidth={1.7} />
                            보기
                            <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
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
  const linkMemorial = visibility === "link";
  const label = privateMemorial
    ? "비공개"
    : linkMemorial
      ? "링크 공개"
      : "전체 공개";

  return (
    <span className="inline-flex w-fit items-center gap-1 border border-[#dbdad7] bg-white px-2 py-1 text-xs text-[#616161]">
      {privateMemorial ? (
        <LockKeyhole className="h-3 w-3" />
      ) : (
        <Globe2 className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "published"
      ? "게시중"
      : status === "private"
        ? "비공개"
        : status || "상태 확인";

  return (
    <span className="inline-flex w-fit items-center border border-[#dbdad7] bg-[#f8f7f4] px-2 py-1 text-xs text-[#616161]">
      {label}
    </span>
  );
}

function MetaText({
  icon,
  label,
  value,
  compact,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "text-xs text-[#777]" : "text-sm text-[#616161]"}>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#777] lg:hidden">
        {icon}
        {label}
      </p>
      <p className="leading-6">{value}</p>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="border border-[#dbdad7] px-5 py-16 text-center">
      <p className="text-sm font-medium text-[#121212]">
        아직 만든 추모관이 없습니다.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#616161]">
        소망 만들기에서 고인의 기본 정보와 삶의 기록을 입력하면 이곳에서 다시
        확인하고 수정할 수 있습니다.
      </p>
      <div className="mx-auto mt-6 grid max-w-xl gap-px border border-[#dbdad7] bg-[#dbdad7] text-left sm:grid-cols-3">
        {["고인 정보 입력", "공개 범위 선택", "추모관 관리"].map(item => (
          <div key={item} className="bg-white p-4 text-xs text-[#616161]">
            {item}
          </div>
        ))}
      </div>
      <Link href="/memorial/create">
        <button className="mt-6 inline-flex h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={1.7} />
          소망 만들기
        </button>
      </Link>
    </div>
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatNullableDate(value: Date | string | null) {
  if (!value) return "미정";
  return formatDate(value);
}
