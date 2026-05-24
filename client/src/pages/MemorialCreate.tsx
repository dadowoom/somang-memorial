import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Check,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type TimelineItem = {
  id: string;
  year: string;
  title: string;
  description: string;
};

type Visibility = "public" | "private";

type MemorialForm = {
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  church: string;
  familyContact: string;
  familyPhone: string;
  slug: string;
  verse: string;
  verseRef: string;
  summary: string;
  story: string;
  serviceTime: string;
  memorialDay: string;
  visibility: Visibility;
  accessPassword: string;
};

type CreatedMemorial = {
  id: number;
  slug: string;
  status: string;
  href: string;
};

const draftKey = "somang.memorialCreateDraft";

const initialForm: MemorialForm = {
  name: "",
  role: "",
  birthDate: "",
  deathDate: "",
  church: "소망교회",
  familyContact: "",
  familyPhone: "",
  slug: "",
  verse: "",
  verseRef: "",
  summary: "",
  story: "",
  serviceTime: "",
  memorialDay: "",
  visibility: "public",
  accessPassword: "",
};

const requiredFields: Array<{ key: keyof MemorialForm; label: string }> = [
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const makeId = () => {
  const nativeUuid = globalThis.crypto?.randomUUID;
  if (typeof nativeUuid === "function") {
    try {
      return nativeUuid.call(globalThis.crypto);
    } catch {
      // Plain HTTP origins can expose crypto without allowing randomUUID.
    }
  }

  return `timeline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const makeTimelineItem = (): TimelineItem => ({
  id: makeId(),
  year: "",
  title: "",
  description: "",
});

export default function MemorialCreate() {
  const { user, loading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [form, setForm] = useState<MemorialForm>(initialForm);
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    makeTimelineItem(),
    makeTimelineItem(),
  ]);
  const [portraitPreview, setPortraitPreview] = useState("");
  const [portraitName, setPortraitName] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MemorialForm, string>>
  >({});
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [createdMemorial, setCreatedMemorial] =
    useState<CreatedMemorial | null>(null);
  const createMemorialMutation = trpc.memorial.create.useMutation();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;

      const parsed = JSON.parse(saved) as {
        form?: Partial<MemorialForm>;
        timeline?: TimelineItem[];
      };

      if (parsed.form) {
        const { managerMemo: _managerMemo, ...savedForm } = parsed.form as
          | (Partial<MemorialForm> & { managerMemo?: string })
          | Record<string, never>;

        setForm({ ...initialForm, ...savedForm });
      }

      if (Array.isArray(parsed.timeline) && parsed.timeline.length > 0) {
        setTimeline(
          parsed.timeline.map(item => ({
            id: item.id || makeId(),
            year: item.year || "",
            title: item.title || "",
            description: item.description || "",
          }))
        );
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, []);

  const completion = useMemo(() => {
    const filled = requiredFields.filter(({ key }) => form[key].trim()).length;
    return {
      filled,
      total: requiredFields.length,
      percent: Math.round((filled / requiredFields.length) * 100),
    };
  }, [form]);

  const slugPreview = useMemo(() => {
    if (form.slug.trim()) return form.slug.trim();
    if (form.name.trim()) return form.name.trim().replace(/\s+/g, "-");
    return "memorial-name";
  }, [form.name, form.slug]);

  const missingLabels = useMemo(
    () =>
      requiredFields
        .filter(({ key }) => !form[key].trim())
        .map(({ label }) => label),
    [form]
  );

  const updateField = (key: keyof MemorialForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setSubmitted(false);
    setCreatedMemorial(null);
  };

  const updateVisibility = (visibility: Visibility) => {
    setForm(current => ({
      ...current,
      visibility,
      accessPassword:
        visibility === "private" ? current.accessPassword : "",
    }));
    setErrors(current => ({
      ...current,
      accessPassword: undefined,
      visibility: undefined,
    }));
    setSubmitted(false);
    setCreatedMemorial(null);
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
    setTimeline(items => items.filter(item => item.id !== id));
  };

  const handlePortraitChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPortraitName(file.name);
    setPortraitPreview(await readFileAsDataUrl(file));
    setSubmitted(false);
    setCreatedMemorial(null);
  };

  const handleGalleryChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (files.length === 0) return;

    const previews = await Promise.all(files.map(readFileAsDataUrl));
    setGalleryPreviews(previews);
    setSubmitted(false);
    setCreatedMemorial(null);
  };

  const saveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify({ form, timeline }));
    setNotice(
      "임시저장되었습니다. 이 브라우저에서 다시 이어서 작성할 수 있습니다."
    );
    setSubmitted(false);
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof MemorialForm, string>> = {};

    requiredFields.forEach(({ key, label }) => {
      if (!form[key].trim()) {
        nextErrors[key] = `${label}을 입력해 주세요.`;
      }
    });

    if (form.visibility === "private" && !form.accessPassword.trim()) {
      nextErrors.accessPassword = "비공개 추모관 입장 비밀번호를 입력해 주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      setNotice("필수 항목을 먼저 채워 주세요.");
      setSubmitted(false);
      document
        .getElementById("basic")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    try {
      setNotice("추모관을 생성하고 있습니다.");
      const created = await createMemorialMutation.mutateAsync({
        ...form,
        slug: slugPreview,
        timeline: timeline.map(({ year, title, description }) => ({
          year,
          title,
          description,
        })),
      });

      localStorage.removeItem(draftKey);
      setCreatedMemorial(created);
      setNotice("추모관이 생성되었습니다. 바로 확인할 수 있습니다.");
      setSubmitted(true);
    } catch (error) {
      console.error("[Memorial Create] Failed to save", error);
      setNotice("저장 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.");
      setSubmitted(false);
      setCreatedMemorial(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-[#121212]">
        <Navbar />
        <main className="container pt-32">
          <div className="border border-[#dbdad7] py-20 text-center">
            <p className="text-sm text-[#616161]">
              로그인 상태를 확인하고 있습니다.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-[#121212]">
        <Navbar />
        <main className="container pt-32">
          <div className="border border-[#dbdad7] py-20 text-center">
            <p className="text-sm text-[#616161]">
              회원가입 또는 로그인 후 추모관을 생성할 수 있습니다.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#dbdad7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
            <div>
              <p className="mb-5 text-xs font-medium text-[#616161]">
                추모관 생성
              </p>
              <h1
                className="text-4xl font-normal leading-tight md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                아름다운 소망을
                <br />
                만드세요
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#616161]">
                <span className="block">
                  사랑하는 분의 삶과 믿음을 조용히 담아
                </span>
                <span className="block">
                  가족과 교회가 오래 기억할 수 있는 소망을 남겨보세요.
                </span>
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

              <div className="mt-6 grid gap-px bg-[#dbdad7] sm:grid-cols-3">
                {["정보 입력", "기록 정리", "등록 완료"].map((step, index) => (
                  <div key={step} className="bg-white p-4">
                    <p className="text-xs text-[#616161]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-sm text-[#121212]">{step}</p>
                  </div>
                ))}
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
            </aside>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="py-8 md:py-12">
          <div className="container grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 border border-[#dbdad7] p-5">
                <p className="text-sm font-medium text-[#121212]">입력 항목</p>
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
                    href="#photos"
                    className="block transition-colors hover:text-[#121212]"
                  >
                    사진
                  </a>
                  <a
                    href="#settings"
                    className="block transition-colors hover:text-[#121212]"
                  >
                    공개 설정
                  </a>
                </nav>

                <div className="mt-8 border-t border-[#dbdad7] pt-5">
                  <p className="text-xs text-[#616161]">예상 주소</p>
                  <p className="mt-2 break-all text-sm text-[#121212]">
                    /memorial/{slugPreview}
                  </p>
                </div>
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
                      placeholder="김영수"
                      aria-invalid={Boolean(errors.name)}
                    />
                  </Field>

                  <Field label="직분" error={errors.role} required>
                    <select
                      className={selectClass}
                      value={form.role}
                      onChange={event =>
                        updateField("role", event.target.value)
                      }
                      aria-invalid={Boolean(errors.role)}
                    >
                      <option value="">선택해 주세요</option>
                      <option value="장로">장로</option>
                      <option value="권사">권사</option>
                      <option value="집사">집사</option>
                      <option value="목사">목사</option>
                      <option value="성도">성도</option>
                    </select>
                  </Field>

                  <Field label="출생일" error={errors.birthDate} required>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.birthDate}
                      onChange={event =>
                        updateField("birthDate", event.target.value)
                      }
                      aria-invalid={Boolean(errors.birthDate)}
                    />
                  </Field>

                  <Field label="소천일" error={errors.deathDate} required>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.deathDate}
                      onChange={event =>
                        updateField("deathDate", event.target.value)
                      }
                      aria-invalid={Boolean(errors.deathDate)}
                    />
                  </Field>

                  <Field label="소속 교회">
                    <input
                      className={inputClass}
                      value={form.church}
                      onChange={event =>
                        updateField("church", event.target.value)
                      }
                      placeholder="소망교회"
                    />
                  </Field>

                  <Field label="추모관 주소">
                    <input
                      className={inputClass}
                      value={form.slug}
                      onChange={event =>
                        updateField("slug", event.target.value)
                      }
                      placeholder={slugPreview}
                    />
                  </Field>

                  <Field label="가족 대표 성함">
                    <input
                      className={inputClass}
                      value={form.familyContact}
                      onChange={event =>
                        updateField("familyContact", event.target.value)
                      }
                      placeholder="홍길동"
                    />
                  </Field>

                  <Field label="연락처">
                    <input
                      className={inputClass}
                      value={form.familyPhone}
                      onChange={event =>
                        updateField("familyPhone", event.target.value)
                      }
                      placeholder="010-0000-0000"
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
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_180px]">
                    <Field label="대표 말씀">
                      <input
                        className={inputClass}
                        value={form.verse}
                        onChange={event =>
                          updateField("verse", event.target.value)
                        }
                        placeholder="내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고..."
                      />
                    </Field>

                    <Field label="말씀 출처">
                      <input
                        className={inputClass}
                        value={form.verseRef}
                        onChange={event =>
                          updateField("verseRef", event.target.value)
                        }
                        placeholder="딤후 4:7"
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
                      placeholder="믿음과 사랑으로 가족과 교회를 섬긴 분"
                      aria-invalid={Boolean(errors.summary)}
                    />
                  </Field>

                  <Field label="삶의 기록" error={errors.story} required>
                    <textarea
                      className={textAreaClass}
                      value={form.story}
                      onChange={event =>
                        updateField("story", event.target.value)
                      }
                      placeholder="고인의 삶, 신앙, 가족에게 남긴 기억을 간결하게 적어 주세요."
                      aria-invalid={Boolean(errors.story)}
                    />
                  </Field>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="예배 일시">
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={form.serviceTime}
                        onChange={event =>
                          updateField("serviceTime", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="추도일">
                      <input
                        type="date"
                        className={inputClass}
                        value={form.memorialDay}
                        onChange={event =>
                          updateField("memorialDay", event.target.value)
                        }
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

                <div className="space-y-6">
                  {timeline.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-4 border-b border-[#dbdad7] pb-6 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-[#616161]">
                          기록 {index + 1}
                        </p>
                        {timeline.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeline(item.id)}
                            className="inline-flex h-9 items-center gap-2 px-1 text-sm text-[#616161] transition-colors hover:text-[#121212]"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                            삭제
                          </button>
                        )}
                      </div>

                      <div className="grid gap-6 md:grid-cols-[120px_minmax(0,1fr)]">
                        <input
                          className={inputClass}
                          value={item.year}
                          onChange={event =>
                            updateTimeline(item.id, "year", event.target.value)
                          }
                          placeholder="연도"
                        />
                        <input
                          className={inputClass}
                          value={item.title}
                          onChange={event =>
                            updateTimeline(item.id, "title", event.target.value)
                          }
                          placeholder="제목"
                        />
                      </div>

                      <textarea
                        className="min-h-24 w-full resize-y border border-[#dbdad7] bg-transparent p-4 text-sm leading-7 text-[#121212] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#18181b]"
                        value={item.description}
                        onChange={event =>
                          updateTimeline(
                            item.id,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="간단한 설명"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTimeline}
                  className="mt-6 inline-flex h-11 items-center gap-2 border border-[#dbdad7] px-4 text-sm transition-colors hover:bg-[#f6f5f2]"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.6} />
                  기록 추가
                </button>
              </section>

              <section
                id="photos"
                className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
              >
                <SectionHeader number="04" title="사진" />

                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div>
                    <label className={labelClass}>대표 사진</label>
                    <label className="flex aspect-[4/5] w-full flex-col items-center justify-center border border-dashed border-[#dbdad7] bg-[#fafafa] text-center text-sm text-[#616161] transition-colors hover:border-[#18181b] hover:text-[#121212]">
                      {portraitPreview ? (
                        <img
                          src={portraitPreview}
                          alt="대표 사진 미리보기"
                          className="h-full w-full object-cover grayscale"
                        />
                      ) : (
                        <>
                          <Upload className="mb-3 h-6 w-6" strokeWidth={1.5} />
                          사진 선택
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePortraitChange}
                        className="sr-only"
                      />
                    </label>
                    {portraitName && (
                      <p className="mt-3 break-all text-xs text-[#616161]">
                        {portraitName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>추억 사진</label>
                    <label className="flex min-h-36 w-full flex-col items-center justify-center gap-3 border border-dashed border-[#dbdad7] text-center text-sm text-[#616161] transition-colors hover:border-[#18181b] hover:text-[#121212]">
                      <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                      최대 6장 선택
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryChange}
                        className="sr-only"
                      />
                    </label>

                    {galleryPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-px bg-[#dbdad7] sm:grid-cols-6">
                        {galleryPreviews.map((preview, index) => (
                          <img
                            key={preview}
                            src={preview}
                            alt={`추억 사진 ${index + 1}`}
                            className="aspect-square w-full bg-white object-cover grayscale"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section
                id="settings"
                className="scroll-mt-24 border border-[#dbdad7] p-5 md:p-8"
              >
                <SectionHeader number="05" title="공개 설정" />

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
                    <p className="mt-3 text-xs leading-6 text-[#616161]">
                      기본 정보는 검색 결과에 표시됩니다. 비공개로 설정하면
                      비밀번호를 아는 분만 추모관에 들어갈 수 있습니다.
                    </p>
                  </Field>

                  {form.visibility === "private" && (
                    <Field
                      label="추모관 입장 비밀번호"
                      error={errors.accessPassword}
                      required
                    >
                      <input
                        type="password"
                        className={inputClass}
                        value={form.accessPassword}
                        onChange={event =>
                          updateField("accessPassword", event.target.value)
                        }
                        placeholder="비밀번호를 입력해 주세요"
                        aria-invalid={Boolean(errors.accessPassword)}
                      />
                    </Field>
                  )}

                </div>
              </section>

              <section className="border border-[#dbdad7] p-5 md:p-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-[#121212]">
                      {submitted
                        ? "추모관이 생성되었습니다."
                        : "입력 내용을 확인해 주세요."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#616161]">
                      {notice ||
                        "작성한 내용은 추모관으로 저장됩니다. 이후 필요한 내용은 이어서 보완할 수 있습니다."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#dbdad7] px-5 text-sm transition-colors hover:bg-[#f6f5f2]"
                    >
                      <Save className="h-4 w-4" strokeWidth={1.6} />
                      임시저장
                    </button>
                    <Link href="/">
                      <button
                        type="button"
                        className="h-11 w-full border border-[#dbdad7] px-5 text-sm transition-colors hover:bg-[#f6f5f2] sm:w-auto"
                      >
                        홈으로
                      </button>
                    </Link>
                    <button
                      type="submit"
                      disabled={createMemorialMutation.isPending}
                      className="inline-flex h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      {createMemorialMutation.isPending
                        ? "저장 중"
                        : "추모관 생성"}
                      <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              </section>

              {submitted && (
                <section className="border border-[#18181b] p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-[#18181b] text-white">
                      <Check className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#121212]">
                        생성 완료
                      </p>
                      <dl className="mt-4 grid gap-3 text-sm text-[#616161] sm:grid-cols-2">
                        <SummaryItem label="성함" value={form.name} />
                        <SummaryItem label="직분" value={form.role} />
                        <SummaryItem label="소속" value={form.church} />
                        <SummaryItem
                          label="주소"
                          value={
                            createdMemorial?.href || `/memorial/${slugPreview}`
                          }
                        />
                        <SummaryItem
                          label="상태"
                          value={
                            createdMemorial?.status === "published"
                              ? "등록 완료"
                              : createdMemorial?.status || "등록 완료"
                          }
                        />
                      </dl>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-[#dbdad7] pb-5">
      <h2
        className="text-2xl font-normal"
        style={{ fontFamily: "'Noto Serif KR', serif" }}
      >
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[#dbdad7] pt-3">
      <dt className="text-xs text-[#616161]">{label}</dt>
      <dd className="mt-1 break-all text-[#121212]">{value || "-"}</dd>
    </div>
  );
}
