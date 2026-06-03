import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type AdminLetter = {
  id: number;
  author: string;
  content: string;
  status: "published" | "hidden";
  createdAt: Date | string;
  memorialSlug: string | null;
  memorialName: string;
  memorialRole: string;
  memorialVisibility: string;
};

type AdminReminder = {
  id: number;
  phone: string;
  memorialDay: string | null;
  status: "active" | "cancelled";
  consentAt: Date | string;
  updatedAt: Date | string;
  memorialSlug: string;
  memorialName: string;
  memorialRole: string;
  memorialVisibility: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function AdminOperations() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [query, setQuery] = useState("");
  const utils = trpc.useUtils();
  const lettersQuery = trpc.letter.adminList.useQuery(
    { limit: 300 },
    { enabled: user?.role === "admin" }
  );
  const remindersQuery = trpc.reminder.adminList.useQuery(
    { limit: 300 },
    { enabled: user?.role === "admin" }
  );
  const updateLetter = trpc.letter.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.letter.adminList.invalidate(),
        utils.letter.recent.invalidate(),
        utils.letter.byMemorial.invalidate(),
      ]);
    },
  });
  const updateReminder = trpc.reminder.updateStatus.useMutation({
    onSuccess: () => utils.reminder.adminList.invalidate(),
  });

  const letters = (lettersQuery.data ?? []) as AdminLetter[];
  const reminders = (remindersQuery.data ?? []) as AdminReminder[];
  const keyword = query.trim();

  const filteredLetters = useMemo(() => {
    if (!keyword) return letters;
    return letters.filter(letter =>
      [letter.memorialName, letter.author, letter.content, letter.status]
        .join(" ")
        .includes(keyword)
    );
  }, [keyword, letters]);

  const filteredReminders = useMemo(() => {
    if (!keyword) return reminders;
    return reminders.filter(reminder =>
      [
        reminder.memorialName,
        reminder.memorialRole,
        reminder.phone,
        reminder.memorialDay ?? "",
        reminder.status,
      ]
        .join(" ")
        .includes(keyword)
    );
  }, [keyword, reminders]);

  if (loading) {
    return <StateScreen text="관리자 권한을 확인하고 있습니다." />;
  }

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
                Admin Operations
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={serifStyle}
              >
                운영 관리
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#616161]">
                하늘로 보내는 편지와 추도일 알림 신청을 한 곳에서 확인하고
                필요한 항목만 조용히 정리합니다.
              </p>
            </div>

            <div className="grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-3">
              <Stat label="전체 편지" value={`${letters.length}`} />
              <Stat
                label="숨김 편지"
                value={`${letters.filter(letter => letter.status === "hidden").length}`}
              />
              <Stat
                label="알림 신청"
                value={`${reminders.filter(item => item.status === "active").length}`}
              />
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex min-w-0 flex-1 items-center gap-3 border border-[#dbdad7] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-[#616161]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="고인, 작성자, 내용, 연락처로 찾기"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9a9a]"
                />
              </label>
              <Link href="/admin">
                <button className="h-12 border border-[#dbdad7] bg-white px-5 text-sm text-[#121212] transition-colors hover:bg-[#f6f5f2]">
                  추모관 관리
                </button>
              </Link>
            </div>

            <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <section>
                <SectionTitle
                  icon={<Mail className="h-4 w-4" />}
                  title="편지 관리"
                  count={filteredLetters.length}
                />

                {lettersQuery.isLoading ? (
                  <Panel text="편지를 불러오고 있습니다." />
                ) : lettersQuery.isError ? (
                  <Panel text="편지 목록을 불러오지 못했습니다." />
                ) : filteredLetters.length === 0 ? (
                  <Panel text="조건에 맞는 편지가 없습니다." />
                ) : (
                  <div className="divide-y divide-[#dbdad7] border-y border-[#dbdad7]">
                    {filteredLetters.map(letter => {
                      const hidden = letter.status === "hidden";
                      return (
                        <article
                          key={letter.id}
                          className="grid gap-4 bg-white px-4 py-5 md:grid-cols-[minmax(0,1fr)_132px] md:items-start"
                        >
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <StatusBadge
                                tone={hidden ? "muted" : "normal"}
                                label={hidden ? "숨김" : "공개"}
                              />
                              <StatusBadge
                                tone={
                                  letter.memorialVisibility === "private"
                                    ? "muted"
                                    : "normal"
                                }
                                label={
                                  letter.memorialVisibility === "private"
                                    ? "비공개 추모관"
                                    : letter.memorialVisibility === "standalone"
                                      ? "직접 작성"
                                      : "전체 공개"
                                }
                              />
                              <span className="text-xs text-[#777]">
                                {formatDate(letter.createdAt)}
                              </span>
                            </div>
                            <h2
                              className="text-xl font-normal"
                              style={serifStyle}
                            >
                              {letter.memorialName} {letter.memorialRole}
                            </h2>
                            <p className="mt-2 text-sm text-[#616161]">
                              From {letter.author}
                            </p>
                            <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#4f4f4f]">
                              {letter.content}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={updateLetter.isPending}
                            onClick={() =>
                              updateLetter.mutate({
                                id: letter.id,
                                status: hidden ? "published" : "hidden",
                              })
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 border border-[#18181b] px-4 text-sm text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                            {hidden ? "복원" : "숨김"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <SectionTitle
                  icon={<Bell className="h-4 w-4" />}
                  title="추도일 알림"
                  count={filteredReminders.length}
                />

                {remindersQuery.isLoading ? (
                  <Panel text="알림 신청을 불러오고 있습니다." />
                ) : remindersQuery.isError ? (
                  <Panel text="알림 신청 목록을 불러오지 못했습니다." />
                ) : filteredReminders.length === 0 ? (
                  <Panel text="조건에 맞는 알림 신청이 없습니다." />
                ) : (
                  <div className="divide-y divide-[#dbdad7] border-y border-[#dbdad7]">
                    {filteredReminders.map(reminder => {
                      const active = reminder.status === "active";
                      return (
                        <article key={reminder.id} className="bg-white p-5">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <StatusBadge
                              tone={active ? "normal" : "muted"}
                              label={active ? "활성" : "취소"}
                            />
                            <span className="text-xs text-[#777]">
                              신청 {formatDate(reminder.consentAt)}
                            </span>
                          </div>
                          <h2
                            className="text-xl font-normal"
                            style={serifStyle}
                          >
                            {reminder.memorialName} {reminder.memorialRole}
                          </h2>
                          <dl className="mt-4 grid gap-2 text-sm text-[#616161]">
                            <div className="flex justify-between gap-4">
                              <dt>연락처</dt>
                              <dd className="font-medium text-[#121212]">
                                {formatPhone(reminder.phone)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt>추도일</dt>
                              <dd>{reminder.memorialDay || "추후 안내"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt>최근 변경</dt>
                              <dd>{formatDate(reminder.updatedAt)}</dd>
                            </div>
                          </dl>

                          <button
                            type="button"
                            disabled={updateReminder.isPending}
                            onClick={() =>
                              updateReminder.mutate({
                                id: reminder.id,
                                status: active ? "cancelled" : "active",
                              })
                            }
                            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 border border-[#dbdad7] px-4 text-sm text-[#121212] transition-colors hover:bg-[#f6f5f2] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            {active ? "알림 취소 처리" : "다시 활성화"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-[#dbdad7] pb-4">
      <h2 className="flex items-center gap-2 text-base font-medium">
        {icon}
        {title}
      </h2>
      <span className="text-sm text-[#616161]">{count}건</span>
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

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "normal" | "muted";
}) {
  return (
    <span
      className={`inline-flex w-fit items-center border px-2 py-1 text-xs ${
        tone === "normal"
          ? "border-[#18181b] text-[#121212]"
          : "border-[#dbdad7] text-[#616161]"
      }`}
    >
      {label}
    </span>
  );
}

function Panel({ text }: { text: string }) {
  return (
    <div className="border border-[#dbdad7] py-16 text-center">
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return value;
}
