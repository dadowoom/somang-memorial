import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

type Visibility = "public" | "private";

type TimelineItem = {
  id: string;
  year: string;
  title: string;
  description: string;
};

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
  verse: string | null;
  verseRef: string | null;
  summary: string;
  story: string;
  servicePlace: string | null;
  serviceTime: string | null;
  memorialDay: string | null;
  visibility: string;
  managerMemo: string | null;
  timeline: Array<{
    year: string;
    title: string;
    description: string;
  }>;
  hasAccessPassword: boolean;
  href: string;
};

type FormState = {
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  familyContact: string;
  familyPhone: string;
  verse: string;
  verseRef: string;
  summary: string;
  story: string;
  serviceTime: string;
  memorialDay: string;
  visibility: Visibility;
  accessPassword: string;
  managerMemo: string;
};

const initialForm: FormState = {
  name: "",
  role: "",
  birthDate: "",
  deathDate: "",
  church: "소망교회",
  familyContact: "",
  familyPhone: "",
  verse: "",
  verseRef: "",
  summary: "",
  story: "",
  serviceTime: "",
  memorialDay: "",
  visibility: "public",
  accessPassword: "",
  managerMemo: "",
};

const requiredFields: Array<{ key: keyof FormState; label: string }> = [
  { key: "name", label: "성함" },
  { key: "role", label: "직분" },
  { key: "birthDate", label: "출생일" },
  { key: "deathDate", label: "소천일" },
  { key: "summary", label: "한 줄 소개" },
  { key: "story", label: "삶의 기록" },
];

const visibilityOptions: Array<{
  value: Visibility;
  label: string;
  desc: string;
}> = [
  {
    value: "public",
    label: "전체 공개",
    desc: "누구나 추모관에 들어갈 수 있습니다.",
  },
  {
    value: "private",
    label: "비공개",
    desc: "비밀번호를 아는 분만 들어갈 수 있습니다.",
  },
];

const inputClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";
const selectClass =
  "h-12 w-full border-0 border-b border-[#dbdad7] bg-transparent px-0 text-sm text-[#121212] outline-none transition-colors focus:border-[#18181b]";
const textAreaClass =
  "min-h-36 w-full resize-y border border-[#dbdad7] bg-transparent p-4 text-sm leading-7 text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]";
const labelClass = "mb-2 block text-xs font-medium text-[#616161]";
const errorClass = "mt-2 text-xs text-[#9f2a2a]";
const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

const makeTimelineId = () =>
  `timeline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeTimelineItem = (): TimelineItem => ({
  id: makeTimelineId(),
  year: "",
  title: "",
  description: "",
});

export default function MemorialEdit() {
  const [, params] = useRoute<{ slug: string }>(
    "/admin/memorials/:slug/edit"
  );
  const slug = params?.slug ?? "";
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const memorialQuery = trpc.memorial.adminBySlug.useQuery(
    { slug },
    { enabled: Boolean(slug) && user?.role === "admin", retry: false }
  );
  const updateMemorial = trpc.memorial.update.useMutation();

  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  const [notice, setNotice] = useState("");
  const memorial = memorialQuery.data as AdminMemorial | undefined;

  useEffect(() => {
    if (!memorial || loadedId === memorial.id) return;

    setForm({
      name: memorial.name,
      role: memorial.role,
      birthDate: memorial.birthDate,
      deathDate: memorial.deathDate,
      church: memorial.church,
      familyContact: memorial.familyContact ?? "",
      familyPhone: memorial.familyPhone ?? "",
      verse: memorial.verse ?? "",
      verseRef: memorial.verseRef ?? "",
      summary: memorial.summary,
      story: memorial.story,
      serviceTime: memorial.serviceTime ?? "",
      memorialDay: memorial.memorialDay ?? "",
      visibility: memorial.visibility === "private" ? "private" : "public",
      accessPassword: "",
      managerMemo: memorial.managerMemo ?? "",
    });
    setTimeline(
      memorial.timeline.length > 0
        ? memorial.timeline.map(item => ({
            id: makeTimelineId(),
            year: item.year,
            title: item.title,
            description: item.description,
          }))
        : [makeTimelineItem()]
    );
    setErrors({});
    setNotice("");
    setLoadedId(memorial.id);
  }, [loadedId, memorial]);

  const completion = useMemo(() => {
    const filled = requiredFields.filter(({ key }) => form[key].trim()).length;
    return {
      filled,
      total: requiredFields.length,
      percent: Math.round((filled / requiredFields.length) * 100),
    };
  }, [form]);

  const missingLabels = useMemo(
    () =>
      requiredFields
        .filter(({ key }) => !form[key].trim())
        .map(({ label }) => label),
    [form]
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setNotice("");
  };

  const updateVisibility = (visibility: Visibility) => {
    setForm(current => ({
      ...current,
      visibility,
      accessPassword: visibility === "private" ? current.accessPassword : "",
    }));
    setErrors(current => ({ ...current, accessPassword: undefined }));
    setNotice("");
  };

  const updateTimeline = (
    id: string,
    field: keyof Omit<TimelineItem, "id">,
    value: string
  ) => {
    setTimeline(items =>
      items.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addTimeline = () => {
    setTimeline(items => [...items, makeTimelineItem()]);
  };

  const removeTimeline = (id: string) => {
    setTimeline(items =>
      items.length > 1 ? items.filter(item => item.id !== id) : items
    );
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    requiredFields.forEach(({ key, label }) => {
      if (!form[key].trim()) {
        nextErrors[key] = `${label}을 입력해 주세요.`;
      }
    });

    if (
      form.visibility === "private" &&
      !memorial?.hasAccessPassword &&
      !form.accessPassword.trim()
    ) {
      nextErrors.accessPassword =
        "비공개 추모관은 입장 비밀번호를 입력해 주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memorial) return;

    if (!validate()) {
      setNotice("필수 항목을 먼저 채워 주세요.");
      document
        .getElementById("basic")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    try {
      setNotice("수정 내용을 저장하고 있습니다.");
      await updateMemorial.mutateAsync({
        id: memorial.id,
        name: form.name,
        role: form.role,
        birthDate: form.birthDate,
        deathDate: form.deathDate,
        church: form.church,
        familyContact: form.familyContact || null,
        familyPhone: form.familyPhone || null,
        verse: form.verse || null,
        verseRef: form.verseRef || null,
        summary: form.summary,
        story: form.story,
        serviceTime: form.serviceTime || null,
        memorialDay: form.memorialDay || null,
        visibility: form.visibility,
        accessPassword: form.accessPassword.trim() || undefined,
        managerMemo: form.managerMemo || null,
        timeline: timeline.map(({ year, title, description }) => ({
          year,
          title,
          description,
        })),
      });

      await Promise.all([
        utils.memorial.adminBySlug.invalidate({ slug }),
        utils.memorial.adminList.invalidate(),
        utils.memorial.bySlug.invalidate({ slug }),
      ]);
      setForm(current => ({ ...current, accessPassword: "" }));
      setNotice("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("[Memorial Edit] Failed to save", error);
      setNotice("저장 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.");
    }
  };

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
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
            <div>
              <Link href="/admin">
                <button className="mb-8 inline-flex h-10 items-center gap-2 border border-[#dbdad7] bg-white px-4 text-sm text-[#616161] transition-colors hover:text-[#121212]">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
                  관리자 목록
                </button>
              </Link>
              <p className="mb-5 text-xs font-medium text-[#616161]">
                추모관 수정
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={serifStyle}
              >
                {memorial?.name || "기록을 정리합니다"}
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#616161]">
                고인의 삶과 믿음이 잘 전달되도록 기본 정보와 공개 범위를
                정돈합니다.
              </p>
            </div>

            <aside className="border border-[#dbdad7] p-5 md:p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-[#121212]">
                    작성 상태
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#616161]">
                    필수 항목 {completion.filled}/{completion.total}
                  </p>
                </div>
                <span className="text-3xl font-light text-[#121212]">
                  {completion.percent}%
                </span>
              </div>

              <div className="mt-6 h-px bg-[#dbdad7]">
                <div
                  className="h-px bg-[#18181b] transition-all"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>

              {missingLabels.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm text-[#616161]">남은 필수 항목</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingLabels.map(label => (
                      <span
                        key={label}
                        className="border border-[#dbdad7] px-2 py-1 text-xs text-[#616161]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {memorial && (
                <div className="mt-6 border-t border-[#dbdad7] pt-5">
                  <p className="text-xs text-[#616161]">추모관 주소</p>
                  <p className="mt-2 break-all text-sm text-[#121212]">
                    /memorial/{memorial.slug}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {memorialQuery.isLoading ? (
          <StateBlock text="수정할 추모관을 불러오고 있습니다." />
        ) : memorialQuery.isError || !memorial ? (
          <StateBlock text="수정할 추모관을 찾을 수 없습니다." />
        ) : (
          <form onSubmit={handleSubmit} className="py-8 md:py-12">
            <div className="container grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="hidden lg:block">
                <div className="sticky top-24 border border-[#dbdad7] p-5">
                  <p className="text-sm font-medium text-[#121212]">
                    수정 항목
                  </p>
                  <nav className="mt-5 space-y-3 text-sm text-[#616161]">
                    <a
                      href="#basic"
                      className="block transition-colors hover:text-[#121212]"
                    >
                      기본 정보
                    </a>
                    <a
                      href="#story"
                      className="block transition-colors hover:text-[#121212]"
                    >
                      신앙 이야기
                    </a>
                    <a
                      href="#timeline"
                      className="block transition-colors hover:text-[#121212]"
                    >
                      생애 기록
                    </a>
                    <a
                      href="#settings"
                      className="block transition-colors hover:text-[#121212]"
                    >
                      공개 설정
                    </a>
                  </nav>
                </div>
              </aside>

              <div className="space-y-8">
                <section
                  id="basic"
                  className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
                >
                  <SectionHeader number="01" title="기본 정보" />

                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="성함" error={errors.name} required>
                      <input
                        className={inputClass}
                        value={form.name}
                        onChange={event =>
                          updateField("name", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="직분" error={errors.role} required>
                      <select
                        className={selectClass}
                        value={form.role}
                        onChange={event =>
                          updateField("role", event.target.value)
                        }
                      >
                        <option value="">선택해 주세요</option>
                        <option value="권사">권사</option>
                        <option value="장로">장로</option>
                        <option value="집사">집사</option>
                        <option value="목사">목사</option>
                        <option value="성도">성도</option>
                      </select>
                    </Field>

                    <Field label="출생일" error={errors.birthDate} required>
                      <input
                        className={inputClass}
                        value={form.birthDate}
                        onChange={event =>
                          updateField("birthDate", event.target.value)
                        }
                        placeholder="1933 또는 1933-01-01"
                      />
                    </Field>

                    <Field label="소천일" error={errors.deathDate} required>
                      <input
                        className={inputClass}
                        value={form.deathDate}
                        onChange={event =>
                          updateField("deathDate", event.target.value)
                        }
                        placeholder="2026 또는 2026-01-01"
                      />
                    </Field>

                    <Field label="소속 교회">
                      <input
                        className={inputClass}
                        value={form.church}
                        onChange={event =>
                          updateField("church", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="추모관 주소">
                      <input
                        className={`${inputClass} text-[#9a9a9a]`}
                        value={memorial.slug}
                        readOnly
                      />
                      <p className="mt-2 text-xs leading-5 text-[#8a8a8a]">
                        주소 변경은 링크 공유에 영향을 줄 수 있어 별도 처리합니다.
                      </p>
                    </Field>

                    <Field label="가족 대표 성함">
                      <input
                        className={inputClass}
                        value={form.familyContact}
                        onChange={event =>
                          updateField("familyContact", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="연락처">
                      <input
                        className={inputClass}
                        value={form.familyPhone}
                        onChange={event =>
                          updateField("familyPhone", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </section>

                <section
                  id="story"
                  className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
                >
                  <SectionHeader number="02" title="신앙 이야기" />

                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Field label="성경 구절">
                        <textarea
                          className="min-h-28 w-full resize-y border border-[#dbdad7] bg-transparent p-4 text-sm leading-7 outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]"
                          value={form.verse}
                          onChange={event =>
                            updateField("verse", event.target.value)
                          }
                        />
                      </Field>

                      <Field label="성경 구절 위치">
                        <input
                          className={inputClass}
                          value={form.verseRef}
                          onChange={event =>
                            updateField("verseRef", event.target.value)
                          }
                        />
                      </Field>
                    </div>

                    <Field label="한 줄 소개" error={errors.summary} required>
                      <input
                        className={inputClass}
                        value={form.summary}
                        onChange={event =>
                          updateField("summary", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="삶의 기록" error={errors.story} required>
                      <textarea
                        className={textAreaClass}
                        value={form.story}
                        onChange={event =>
                          updateField("story", event.target.value)
                        }
                      />
                    </Field>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Field label="추도일">
                        <input
                          className={inputClass}
                          value={form.memorialDay}
                          onChange={event =>
                            updateField("memorialDay", event.target.value)
                          }
                          placeholder="매년 3월 1일"
                        />
                      </Field>

                      <Field label="예배 일시 안내">
                        <input
                          className={inputClass}
                          value={form.serviceTime}
                          onChange={event =>
                            updateField("serviceTime", event.target.value)
                          }
                          placeholder="추후 안내"
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                <section
                  id="timeline"
                  className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
                >
                  <SectionHeader number="03" title="생애 기록" />

                  <div className="space-y-5">
                    {timeline.map((item, index) => (
                      <div
                        key={item.id}
                        className="border border-[#dbdad7] p-4 md:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <p className="text-sm font-medium text-[#121212]">
                            기록 {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeTimeline(item.id)}
                            className="inline-flex h-9 items-center gap-2 border border-[#dbdad7] px-3 text-xs text-[#616161] transition-colors hover:text-[#121212]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </button>
                        </div>

                        <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
                          <Field label="연도">
                            <input
                              className={inputClass}
                              value={item.year}
                              onChange={event =>
                                updateTimeline(
                                  item.id,
                                  "year",
                                  event.target.value
                                )
                              }
                            />
                          </Field>
                          <Field label="제목">
                            <input
                              className={inputClass}
                              value={item.title}
                              onChange={event =>
                                updateTimeline(
                                  item.id,
                                  "title",
                                  event.target.value
                                )
                              }
                            />
                          </Field>
                        </div>
                        <div className="mt-5">
                          <Field label="내용">
                            <textarea
                              className="min-h-24 w-full resize-y border border-[#dbdad7] bg-transparent p-4 text-sm leading-7 outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]"
                              value={item.description}
                              onChange={event =>
                                updateTimeline(
                                  item.id,
                                  "description",
                                  event.target.value
                                )
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addTimeline}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#dbdad7] px-5 text-sm transition-colors hover:bg-[#f6f5f2]"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.7} />
                      기록 추가
                    </button>
                  </div>
                </section>

                <section
                  id="settings"
                  className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
                >
                  <SectionHeader number="04" title="공개 설정" />

                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="공개 범위">
                      <div className="grid gap-px border border-[#dbdad7] bg-[#dbdad7] sm:grid-cols-2">
                        {visibilityOptions.map(option => {
                          const selected = form.visibility === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateVisibility(option.value)}
                              aria-pressed={selected}
                              className={`min-h-24 bg-white p-4 text-left transition-colors ${
                                selected
                                  ? "text-[#121212] ring-1 ring-inset ring-[#18181b]"
                                  : "text-[#616161] hover:bg-[#faf9f6]"
                              }`}
                            >
                              <span className="block text-base font-medium">
                                {option.label}
                              </span>
                              <span className="mt-2 block text-xs leading-5">
                                {option.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    {form.visibility === "private" && (
                      <Field
                        label="추모관 입장 비밀번호"
                        error={errors.accessPassword}
                        required={!memorial.hasAccessPassword}
                      >
                        <input
                          type="password"
                          className={inputClass}
                          value={form.accessPassword}
                          onChange={event =>
                            updateField("accessPassword", event.target.value)
                          }
                          placeholder={
                            memorial.hasAccessPassword
                              ? "비워두면 기존 비밀번호 유지"
                              : "비밀번호를 입력해 주세요"
                          }
                        />
                      </Field>
                    )}

                    <div className="md:col-span-2">
                      <Field label="관리 메모">
                        <textarea
                          className="min-h-28 w-full resize-y border border-[#dbdad7] bg-transparent p-4 text-sm leading-7 outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]"
                          value={form.managerMemo}
                          onChange={event =>
                            updateField("managerMemo", event.target.value)
                          }
                          placeholder="운영자가 참고할 메모"
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                <section className="border border-[#dbdad7] p-5 md:p-6">
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <p className="text-sm font-medium text-[#121212]">
                        수정 내용을 확인해 주세요.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#616161]">
                        {notice ||
                          "저장하면 공개 추모관과 검색 결과에 바로 반영됩니다."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link href={memorial.href}>
                        <button
                          type="button"
                          className="h-11 w-full border border-[#dbdad7] px-5 text-sm transition-colors hover:bg-[#f6f5f2] sm:w-auto"
                        >
                          추모관 보기
                        </button>
                      </Link>
                      <button
                        type="submit"
                        disabled={updateMemorial.isPending}
                        className="inline-flex h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updateMemorial.isPending ? "저장 중" : "수정 저장"}
                        {updateMemorial.isPending ? (
                          <Save className="h-4 w-4" strokeWidth={1.6} />
                        ) : (
                          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                        )}
                      </button>
                    </div>
                  </div>
                </section>

                {notice === "수정 내용이 저장되었습니다." && (
                  <section className="border border-[#18181b] p-5 md:p-6">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-[#18181b] text-white">
                        <Check className="h-4 w-4" strokeWidth={1.7} />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[#121212]">
                          저장 완료
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#616161]">
                          추모관의 기본 정보와 공개 설정이 갱신되었습니다.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-[#dbdad7] pb-5">
      <h2 className="text-2xl font-normal" style={serifStyle}>
        {title}
      </h2>
      <span className="text-xs text-[#616161]">{number}</span>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-[#121212]">*</span>}
      </label>
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

function StateBlock({ text }: { text: string }) {
  return (
    <section className="py-12">
      <div className="container">
        <div className="border border-[#dbdad7] py-20 text-center">
          <p className="text-sm text-[#616161]">{text}</p>
        </div>
      </div>
    </section>
  );
}

function StateScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="container pt-32">
        <div className="border border-[#dbdad7] py-20 text-center">
          <p className="text-sm text-[#616161]">{text}</p>
        </div>
      </main>
    </div>
  );
}
