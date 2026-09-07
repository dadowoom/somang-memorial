import { useAuth } from "@/_core/hooks/useAuth";
import { errorClass, inputClass, labelClass, selectClass, textAreaClass } from "@/lib/formStyles";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ReviewGroup, ReviewValue, StepGuide, WritingExample } from "@/components/memorial/MemorialCreateGuidance";
import { draftKeyForUser, legacyDraftKey, readMemorialDraft, serializeOwnedDraft, writingFingerprint, type DraftWriting } from "@/lib/memorialCreateDraft";
import { forgetWriting, getWritingSession, rememberWriting } from "@/lib/memorialWritingSession";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  cloneElement,
  FormEvent,
  isValidElement,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  editHref: string;
};

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
  { key: "summary", label: "한 줄 소개" },
  { key: "story", label: "삶의 기록" },
];

/**
 * 등록 화면을 한 번에 다 보여주면 채울 칸이 스무 개가 넘는다. 한 단계씩 나눠
 * 보여주고, 그 단계의 필수 항목만 확인한 뒤 다음으로 넘어가게 한다.
 */
const steps: Array<{
  id: string;
  label: string;
  required: Array<keyof MemorialForm>;
}> = [
  { id: "basic", label: "기본 정보", required: ["name", "role", "birthDate"] },
  { id: "story", label: "신앙 이야기", required: ["summary", "story"] },
  { id: "timeline", label: "생애 기록", required: [] },
  { id: "photos", label: "사진", required: [] },
  { id: "settings", label: "공개 설정 · 최종 확인", required: ["accessPassword"] },
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
    desc: "추모관 본문을 보려면 입장 비밀번호가 필요합니다.",
  },
];


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
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<MemorialForm>(initialForm);
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    makeTimelineItem(),
  ]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof MemorialForm, string>>
  >({});
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState(0);
  const isLastStep = step === steps.length - 1;
  const [submitted, setSubmitted] = useState(false);
  const [createdMemorial, setCreatedMemorial] =
    useState<CreatedMemorial | null>(null);
  const createMemorialMutation = trpc.memorial.create.useMutation();
  const shouldFocusError = useRef(false);
  const submitting = useRef(false);
  const [personalDevice, setPersonalDevice] = useState(false);
  const [hydratedOwner, setHydratedOwner] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState(() => writingFingerprint(initialForm, []));
  const [availableDraft, setAvailableDraft] = useState<{ key: string; legacy: boolean; writing: DraftWriting } | null>(null);
  const usedDraftKeys = useRef(new Set<string>());
  const fingerprint = useMemo(() => writingFingerprint(form, timeline), [form, timeline]);
  const dirty = hydratedOwner === user?.id && fingerprint !== savedFingerprint;

  useEffect(() => {
    if (!user?.id) return;
    const memory = getWritingSession();
    setAvailableDraft(null);
    setPersonalDevice(false);
    setErrors({});
    setSubmitted(false);
    setCreatedMemorial(null);
    if (memory?.userId === user.id) {
      setForm({ ...initialForm, ...memory.form, accessPassword: "" } as MemorialForm);
      setTimeline(memory.timeline);
      setStep(memory.step);
      setSavedFingerprint(memory.savedFingerprint);
      setLastSavedAt(memory.savedAt);
      usedDraftKeys.current = new Set(memory.persistedKeys);
      setNotice("작성 중인 글을 이어서 표시합니다. 입장 비밀번호는 다시 입력해 주세요.");
    } else {
      setForm(initialForm);
      setTimeline([makeTimelineItem()]);
      setStep(0);
      setSavedFingerprint(writingFingerprint(initialForm, []));
      setLastSavedAt(null);
      usedDraftKeys.current = new Set();
      setNotice("");
    }
    try {
      const ownKey = draftKeyForUser(user.id);
      const ownRaw = localStorage.getItem(ownKey);
      const key = ownRaw ? ownKey : legacyDraftKey;
      const raw = ownRaw || localStorage.getItem(legacyDraftKey);
      if (raw) {
        const writing = readMemorialDraft(raw, user.id, key === legacyDraftKey);
        if (writing) setAvailableDraft({ key, writing, legacy: key === legacyDraftKey });
        else setNotice("저장된 글의 형식을 확인하지 못했습니다. 기존 저장 내용은 지우지 않았습니다.");
      }
    } catch {
      setNotice("이 브라우저에서는 임시저장을 이용하기 어렵습니다. 작성은 가능하지만 중요한 글은 따로 보관해 주세요.");
    }
    setHydratedOwner(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user || hydratedOwner !== user.id || submitted) return;
    rememberWriting({ userId: user.id, form, timeline, step, savedAt: lastSavedAt, savedFingerprint, dirty, persistedKeys: Array.from(usedDraftKeys.current) });
  }, [user?.id, hydratedOwner, form, timeline, step, lastSavedAt, savedFingerprint, dirty, submitted]);

  const restoreDraft = () => {
    if (!personalDevice || !availableDraft || submitted || createMemorialMutation.isPending) return;
    if ((dirty || availableDraft.legacy) && !window.confirm(availableDraft.legacy
      ? "이전 방식의 임시저장은 작성자를 확인할 수 없습니다. 본인이 작성한 글이 맞고, 현재 입력한 내용 대신 불러오시겠습니까?"
      : "현재 입력한 내용 대신 임시저장한 글을 불러오시겠습니까?")) return;
    const restored = { ...initialForm, ...availableDraft.writing.form, accessPassword: "" } as MemorialForm;
    setForm(restored);
    setTimeline(availableDraft.writing.timeline);
    setStep(availableDraft.writing.step);
    setLastSavedAt(availableDraft.writing.savedAt);
    setSavedFingerprint(writingFingerprint(restored, availableDraft.writing.timeline));
    usedDraftKeys.current.add(availableDraft.key);
    setAvailableDraft(null);
    setErrors({});
    setNotice("임시저장한 글을 불러왔습니다. 비공개로 등록할 때는 입장 비밀번호를 다시 입력해 주세요.");
  };

  const activeRequiredFields = useMemo(() => form.visibility === "private"
    ? [...requiredFields, { key: "accessPassword" as const, label: "입장 비밀번호" }]
    : requiredFields, [form.visibility]);
  const completion = useMemo(() => {
    const filled = activeRequiredFields.filter(({ key }) => form[key].trim()).length;
    return {
      filled,
      total: activeRequiredFields.length,
      percent: Math.round((filled / activeRequiredFields.length) * 100),
    };
  }, [form, activeRequiredFields]);

  const slugPreview = useMemo(() => {
    if (form.slug.trim()) return form.slug.trim();
    if (form.name.trim()) return form.name.trim().replace(/\s+/g, "-");
    return "memorial-name";
  }, [form.name, form.slug]);

  const missingLabels = useMemo(
    () =>
      activeRequiredFields
        .filter(({ key }) => !form[key].trim())
        .map(({ label }) => label),
    [form, activeRequiredFields]
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
      accessPassword: visibility === "private" ? current.accessPassword : "",
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
    setTimeline(items => items.length < 30 ? [...items, makeTimelineItem()] : items);
  };

  const removeTimeline = (id: string) => {
    setTimeline(items => items.filter(item => item.id !== id));
  };

  const goToStep = (index: number) => {
    setStep(Math.min(Math.max(index, 0), steps.length - 1));
    setNotice("");
  };

  // 단계를 옮기면 그 단계의 제목이 화면 맨 위에 오게 하고 읽어 주도록 한다.
  //
  // 이 일은 화면이 다시 그려진 뒤에 해야 한다. 단계를 바꾸는 순간에 하면
  // 새 단계는 아직 숨어 있어서 스크롤도 포커스도 먹지 않는다. 그래서
  // requestAnimationFrame 이 아니라 useEffect 로 둔다.
  //
  // 처음 화면을 열었을 때는 건너뛴다. 사용자가 옮긴 것이 아니기 때문이다.
  const isFirstStepRender = useRef(true);
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }

    const section = document.getElementById(steps[step].id);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!shouldFocusError.current) return;
    const input = document.getElementById(steps[step].id)
      ?.querySelector<HTMLElement>('[aria-invalid="true"]');
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    shouldFocusError.current = false;
  }, [errors, step]);

  // 이 단계에서 비운 칸만 짚어 준다. 아직 오지 않은 단계까지 미리 지적하면
  // 무엇을 고쳐야 하는지 알기 어렵다.
  const goNext = () => {
    const nextErrors = collectErrors();
    const blocking = steps[step].required.filter(key => nextErrors[key]);
    if (blocking.length > 0) {
      shouldFocusError.current = true;
      setErrors(nextErrors);
      setNotice("이 단계에서 비어 있는 항목을 먼저 채워 주세요.");
      return;
    }
    setErrors({});
    goToStep(step + 1);
  };

  const saveDraft = () => {
    if (submitted || createMemorialMutation.isPending) return;
    if (!personalDevice || !user) {
      setNotice("개인 기기 확인에 체크한 뒤 임시저장을 이용해 주세요. 공용 기기에서는 저장하지 마세요.");
      document.getElementById("personal-writing-device")?.focus();
      return;
    }
    try {
      const key = draftKeyForUser(user.id);
      if (localStorage.getItem(key) && !usedDraftKeys.current.has(key) && !window.confirm("이전에 임시저장한 글을 지금 작성한 내용으로 바꾸시겠습니까?")) return;
      const savedAt = Date.now();
      localStorage.setItem(key, serializeOwnedDraft(user.id, form, timeline, step, savedAt));
      usedDraftKeys.current.add(key);
      setLastSavedAt(savedAt);
      setSavedFingerprint(fingerprint);
      setAvailableDraft(null);
      setNotice("이 브라우저에 글을 임시저장했습니다. 같은 계정으로 로그인해 이어쓸 수 있습니다. 입장 비밀번호는 저장하지 않습니다.");
    } catch {
      setNotice("이 브라우저에 임시저장하지 못했습니다. 작성 중인 내용은 화면에 그대로 있습니다. 중요한 글은 따로 보관해 주세요.");
    }
    setSubmitted(false);
  };

  const collectErrors = () => {
    const nextErrors: Partial<Record<keyof MemorialForm, string>> = {};

    requiredFields.forEach(({ key, label }) => {
      if (!form[key].trim()) {
        nextErrors[key] = `${label}을 입력해 주세요.`;
      }
    });

    if (form.visibility === "private" && !form.accessPassword.trim()) {
      nextErrors.accessPassword =
        "비공개 추모관 입장 비밀번호를 입력해 주세요.";
    }

    return nextErrors;
  };

  const validate = () => {
    const nextErrors = collectErrors();
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || createMemorialMutation.isPending || submitted) return;
    if (!isLastStep) {
      goNext();
      return;
    }

    if (!validate()) {
      shouldFocusError.current = true;
      // 비운 칸이 다른 단계에 있으면 그 단계로 데려간다. 그러지 않으면
      // "채워 주세요"라는 말만 보이고 어디를 채워야 할지 알 수 없다.
      const nextErrors = collectErrors();
      const firstStep = steps.findIndex(item =>
        item.required.some(key => nextErrors[key])
      );
      if (firstStep >= 0 && firstStep !== step) {
        goToStep(firstStep);
      }
      setNotice("비어 있는 항목을 먼저 채워 주세요.");
      setSubmitted(false);
      return;
    }

    try {
      submitting.current = true;
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

      try { usedDraftKeys.current.forEach(key => localStorage.removeItem(key)); } catch { /* Registration already succeeded. */ }
      forgetWriting();
      setCreatedMemorial(created);
      setNotice(created.status === "pending"
        ? "등록 요청이 완료되었습니다. 관리자 확인 전에는 검색과 키오스크에 표시되지 않습니다."
        : "추모관이 생성되었습니다. 등록된 내용을 확인해 주세요.");
      setSubmitted(true);
    } catch (error) {
      console.error("[Memorial Create] Failed to save", error);
      setNotice("저장 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.");
      setSubmitted(false);
      setCreatedMemorial(null);
    } finally {
      submitting.current = false;
    }
  };

  if (loading || (user && hydratedOwner !== user.id)) {
    return (
      <div className="min-h-screen bg-white text-[#121212]">
        <Navbar />
        <main className="container pt-32">
          <div className="border border-[#b5b0a7] py-20 text-center">
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
          <div className="border border-[#b5b0a7] py-20 text-center">
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
        <section className="border-b border-[#b5b0a7]">
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
              <div className="mt-6">
                <WritingExample title="처음이신가요? 작성 순서 보기">
                  <p>기본 정보 → 신앙 이야기 → 생애 기록 → 사진 안내 → 공개 설정 순서로 진행합니다.</p>
                  <p><strong>필수</strong> 표시만 먼저 채워도 됩니다. 긴 글을 완성하려고 애쓰지 않으셔도 괜찮습니다.</p>
                  <p>마지막 단계에서 내용을 다시 확인합니다. 이전 단계로 돌아가도 입력한 글은 유지됩니다.</p>
                  <p>개인 기기에서만 임시저장을 이용해 주세요. 같은 브라우저·같은 계정에서 이어쓸 수 있고, 입장 비밀번호는 저장하지 않습니다.</p>
                </WritingExample>
              </div>
            </div>

            <aside className="border border-[#b5b0a7] p-5 md:p-6">
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

              <div className="mt-6 h-px bg-[#b5b0a7]">
                <div
                  className="h-px bg-[#18181b] transition-all"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>

              <p className="mt-5 text-sm leading-6 text-[#616161]">현재 {step + 1} / 5단계 · {steps[step].label}<br />생애 기록은 선택 사항입니다. 사진은 등록 요청 후 ‘사진 추가하기’에서 준비합니다.</p>

              {missingLabels.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm text-[#616161]">남은 필수 항목</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingLabels.map(label => (
                      <span
                        key={label}
                        className="border border-[#b5b0a7] px-2 py-1 text-xs text-[#616161]"
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

        {!submitted && <section className="container pt-8" aria-labelledby="writing-safety-title">
          <div className="border border-[#d5cfc5] bg-[#fcfbf8] p-5 md:p-6">
            <h2 id="writing-safety-title" className="text-lg font-medium">작성한 글, 안전하게 이어쓰기</h2>
            <p className="mt-2 text-base leading-7 text-[#616161]">창을 닫기 전 임시저장을 눌러주세요. 다른 PC나 휴대폰으로는 이어지지 않습니다. 공용 기기에서는 저장하지 마세요.</p>
            <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 text-base">
              <input id="personal-writing-device" type="checkbox" checked={personalDevice} disabled={createMemorialMutation.isPending} onChange={event => setPersonalDevice(event.target.checked)} className="h-5 w-5 shrink-0" />
              개인 기기입니다. 이 브라우저에서 임시저장·불러오기를 이용합니다.
            </label>
            <p role="status" className="mt-3 text-sm leading-6 text-[#616161]">
              {lastSavedAt ? `마지막 저장: ${new Date(lastSavedAt).toLocaleString("ko-KR")}${dirty ? " · 이후 변경한 내용은 아직 저장되지 않았습니다." : " · 글이 저장되어 있습니다."}` : "아직 이 작성 내용은 임시저장하지 않았습니다."}
            </p>
            <button type="button" onClick={saveDraft} disabled={createMemorialMutation.isPending} className="mt-3 min-h-12 border border-[#18181b] px-5 text-base disabled:opacity-50">지금 임시저장</button>
            {availableDraft && (
              <div className="mt-4 border-t border-[#d5cfc5] pt-4">
                <p className="text-base leading-7">{availableDraft.legacy ? "이전 방식으로 저장된 글이 있습니다. 본인 글이 맞는 개인 기기에서만 불러오세요." : "이 계정으로 임시저장한 글이 있습니다."}</p>
                <button type="button" onClick={restoreDraft} disabled={!personalDevice || createMemorialMutation.isPending} className="mt-3 min-h-12 border border-[#18181b] px-5 text-base disabled:cursor-not-allowed disabled:opacity-50">임시저장한 글 이어쓰기</button>
              </div>
            )}
          </div>
        </section>}
        <form
          onSubmit={handleSubmit}
          noValidate
          onKeyDown={event => {
            // 한글 조합과 여러 줄 글쓰기는 그대로 두고, 입력칸의 Enter로
            // 최종 등록이 실행되지 않도록 한다. 버튼의 Enter 동작은 유지한다.
            if (event.key !== "Enter" || event.nativeEvent.isComposing || !(event.target instanceof HTMLInputElement)) return;
            event.preventDefault();
            if (!isLastStep) goNext();
          }}
          className="py-8 md:py-12"
        >
          <div className="container grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 border border-[#b5b0a7] p-5">
                <p className="text-sm font-medium text-[#121212]">입력 항목</p>
                <nav className="mt-5 space-y-1 text-sm">
                  {steps.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToStep(index)}
                      aria-current={index === step ? "step" : undefined}
                      className={`block w-full py-2 text-left transition-colors ${
                        index === step
                          ? "font-medium text-[#121212]"
                          : "text-[#616161] hover:text-[#121212]"
                      }`}
                    >
                      <span className="mr-2 text-xs text-[#9a9a9a]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-8 border-t border-[#b5b0a7] pt-5">
                  <p className="text-xs text-[#616161]">예상 주소</p>
                  <p className="mt-2 break-all text-sm text-[#121212]">
                    /memorial/{slugPreview}
                  </p>
                </div>
              </div>
            </aside>

            <div className="space-y-8">
              <fieldset disabled={createMemorialMutation.isPending || submitted} className="min-w-0 space-y-8">
              <div className="lg:hidden">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-[#121212]">
                    {steps[step].label}
                  </p>
                  <p className="text-xs text-[#616161]">
                    {step + 1} / {steps.length}
                  </p>
                </div>
                <div className="mt-3 flex gap-1">
                  {steps.map((item, index) => (
                    <span
                      key={item.id}
                      className={`h-1 flex-1 ${
                        index <= step ? "bg-[#18181b]" : "bg-[#dadada]"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <section
                id="basic"
                className={`scroll-mt-24 border border-[#b5b0a7] p-5 md:p-8 ${
                  step === 0 ? "" : "hidden"
                }`}
              >
                <SectionHeader number="01" title="기본 정보" />
                <StepGuide>
                  <p>고인의 성함과 기본 정보를 적어주세요. <strong>필수</strong> 표시가 있는 성함·직분·출생일만 먼저 입력해도 됩니다.</p>
                  <p>정확한 날짜를 모르면 연도만 입력해도 됩니다.</p>
                </StepGuide>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="성함" error={errors.name} required maxLength={120} hint="직분을 빼고 성함만 적어주세요. 예: 김소망">
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={event =>
                        updateField("name", event.target.value)
                      }
                      placeholder="김소망"
                      aria-invalid={Boolean(errors.name)}
                    />
                  </Field>

                  <Field label="직분" error={errors.role} required hint="고인의 교회 직분을 선택해 주세요.">
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

                  <Field label="출생일" error={errors.birthDate} required maxLength={20} hint="예: 1933 또는 1933-01-01. 연도만 알고 계셔도 괜찮습니다.">
                    <input
                      placeholder="1933 또는 1933-01-01"
                      className={inputClass}
                      value={form.birthDate}
                      onChange={event =>
                        updateField("birthDate", event.target.value)
                      }
                      aria-invalid={Boolean(errors.birthDate)}
                    />
                  </Field>

                  <Field label="소천일" error={errors.deathDate} maxLength={20} hint="미리 추모관을 준비하는 경우에는 비워두세요. 예: 2026-01-01">
                    <input
                      placeholder="2026 또는 2026-01-01"
                      className={inputClass}
                      value={form.deathDate}
                      onChange={event =>
                        updateField("deathDate", event.target.value)
                      }
                      aria-invalid={Boolean(errors.deathDate)}
                    />
                  </Field>

                  <Field label="소속 교회" maxLength={160}>
                    <input
                      className={inputClass}
                      value={form.church}
                      onChange={event =>
                        updateField("church", event.target.value)
                      }
                      placeholder="소망교회"
                    />
                  </Field>

                  <Field label="추모관 주소" maxLength={120} hint="비워두면 성함을 바탕으로 자동 생성됩니다. 같은 주소가 있으면 숫자가 붙습니다.">
                    <input
                      className={inputClass}
                      value={form.slug}
                      onChange={event =>
                        updateField("slug", event.target.value)
                      }
                      placeholder={slugPreview}
                    />
                  </Field>

                  <Field label="가족 대표 성함" maxLength={120} hint="교회 담당자가 연락할 가족 대표의 성함을 적어주세요.">
                    <input
                      className={inputClass}
                      value={form.familyContact}
                      onChange={event =>
                        updateField("familyContact", event.target.value)
                      }
                      placeholder="홍길동"
                    />
                  </Field>

                  <Field label="연락처" maxLength={80} hint="가족 대표의 연락 가능한 전화번호입니다. 예: 010-0000-0000">
                    <input
                      type="tel"
                      autoComplete="tel"
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
                className={`scroll-mt-24 border border-[#b5b0a7] p-5 md:p-8 ${
                  step === 1 ? "" : "hidden"
                }`}
              >
                <SectionHeader number="02" title="신앙 이야기" />
                <StepGuide>
                  <p>어떤 분이셨는지 한 문장으로 소개하고, 기억나는 이야기를 편하게 적어주세요.</p>
                  <p>한 줄 소개와 삶의 기록은 필수입니다. 대표 말씀과 예배 정보는 비워두어도 됩니다.</p>
                </StepGuide>
                <WritingExample>
                  <p className="font-medium">아래는 작성 방법을 보여주는 예시입니다. 고인에게 맞는 내용만 직접 적어주세요.</p>
                  <p><strong>한 줄 소개</strong><br />작은 일에도 감사하며 이웃에게 따뜻한 마음을 나누셨던 분입니다.</p>
                  <p><strong>삶의 기록</strong><br />가족의 이야기를 끝까지 들어주시고 조용히 응원해 주셨습니다. 함께 예배드리던 시간과 식탁에 둘러앉아 나누던 대화가 오래 기억에 남습니다.</p>
                  <p>성품, 신앙생활, 교회 봉사, 가족과의 추억 중 기억나는 것부터 2~3문장으로 시작해 보세요. 예시는 자동으로 입력되지 않습니다.</p>
                </WritingExample>

                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_180px]">
                    <Field label="대표 말씀" maxLength={1000} hint="고인이 좋아하셨거나 가족에게 위로가 되는 성경 말씀입니다.">
                      <input
                        className={inputClass}
                        value={form.verse}
                        onChange={event =>
                          updateField("verse", event.target.value)
                        }
                        placeholder="내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고..."
                      />
                    </Field>

                    <Field label="말씀 출처" maxLength={120} hint="예: 디모데후서 4:7">
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

                  <Field label="한 줄 소개" error={errors.summary} required maxLength={255} count={form.summary.length} hint="고인을 떠올리면 생각나는 모습을 한 문장으로 적어주세요.">
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

                  <Field label="삶의 기록" error={errors.story} required maxLength={10000} count={form.story.length} hint="긴 글이 아니어도 괜찮습니다. 살아 있는 가족의 연락처나 민감한 사연은 적지 않도록 살펴주세요.">
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
                    <Field label="예배 일시" hint="정해진 예배가 있을 때만 날짜와 시간을 선택해 주세요.">
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={form.serviceTime}
                        onChange={event =>
                          updateField("serviceTime", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="추도일" maxLength={40} hint="가족이 함께 기억하는 날입니다. 예: 매년 3월 1일">
                      <input
                        placeholder="매년 3월 1일"
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
                className={`scroll-mt-24 border border-[#b5b0a7] p-5 md:p-8 ${
                  step === 2 ? "" : "hidden"
                }`}
              >
                <SectionHeader number="03" title="생애 기록" />
                <StepGuide>
                  <p><strong>선택 항목</strong>입니다. 기억하고 싶은 일을 연도와 함께 남겨주세요. 준비된 기록이 없으면 다음 단계로 넘어가도 됩니다.</p>
                </StepGuide>
                <WritingExample title="생애 기록 예시 보기">
                  <p><strong>연도</strong> 1980<br /><strong>제목</strong> 교회 등록<br /><strong>설명</strong> 가족과 함께 예배드리며 신앙생활을 시작하셨습니다.</p>
                  <p>결혼, 교회 봉사, 가족과의 추억 등 기억나는 일을 오래된 순서대로 적어주세요. 빈 기록은 등록되지 않습니다.</p>
                </WritingExample>

                <div className="space-y-6">
                  {timeline.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-4 border-b border-[#b5b0a7] pb-6 last:border-b-0 last:pb-0"
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
                        <Field label={`기록 ${index + 1} 연도`} maxLength={20}>
                        <input
                          className={inputClass}
                          value={item.year}
                          onChange={event =>
                            updateTimeline(item.id, "year", event.target.value)
                          }
                          placeholder="연도"
                        />
                        </Field>
                        <Field label={`기록 ${index + 1} 제목`} maxLength={160}>
                        <input
                          className={inputClass}
                          value={item.title}
                          onChange={event =>
                            updateTimeline(item.id, "title", event.target.value)
                          }
                          placeholder="제목"
                        />
                        </Field>
                      </div>

                      <Field label={`기록 ${index + 1} 설명`} maxLength={1000}>
                      <textarea
                        className={textAreaClass}
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
                      </Field>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTimeline}
                  disabled={timeline.length >= 30}
                  className="mt-6 inline-flex h-11 items-center gap-2 border border-[#b5b0a7] px-4 text-sm transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.6} />
                  기록 추가
                </button>
                <p className="mt-3 text-sm text-[#616161]">기록은 최대 30개까지 추가할 수 있습니다. 현재 {timeline.length} / 30개</p>
              </section>

              <section
                id="photos"
                className={`scroll-mt-24 border border-[#b5b0a7] p-5 md:p-8 ${
                  step === 3 ? "" : "hidden"
                }`}
              >
                <SectionHeader number="04" title="사진" />
                <StepGuide>
                  <p>사진 없이도 추모관을 등록할 수 있습니다. <strong>이 작성 화면에서는 사진을 저장하지 않습니다.</strong></p>
                  <p>{isAdmin ? "추모관을 생성한 뒤 ‘사진 추가하기’에서 등록해 주세요." : "먼저 글 등록을 요청한 뒤, 완료 화면의 ‘사진 추가하기’에서 사진을 올려주세요. 관리자 확인 전까지 본인 사진을 직접 준비할 수 있습니다."}</p>
                </StepGuide>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border border-[#d5cfc5] p-5">
                    <h3 className="text-lg font-medium">대표 사진 준비하기</h3>
                    <p className="mt-3 text-base leading-7 text-[#616161]">고인의 얼굴이 잘 보이는 세로 사진을 준비해 주세요. 화면에 맞게 가장자리가 잘릴 수 있으니 얼굴 주변에 여유가 있으면 좋습니다.</p>
                  </div>
                  <div className="border border-[#d5cfc5] p-5">
                    <h3 className="text-lg font-medium">추억 사진 준비하기</h3>
                    <p className="mt-3 text-base leading-7 text-[#616161]">가족, 교회, 일상에서 함께했던 사진을 준비해 주세요. 함께 찍힌 분들이 공개에 동의하는 사진을 골라주세요.</p>
                  </div>
                </div>
              </section>

              <section
                id="settings"
                className={`scroll-mt-24 border border-[#b5b0a7] p-5 md:p-8 ${
                  step === 4 ? "" : "hidden"
                }`}
              >
                <SectionHeader number="05" title="공개 설정 · 최종 확인" />
                <StepGuide>
                  <p>누가 추모관을 볼 수 있을지 선택하고, 아래에 모아둔 입력 내용을 확인해 주세요.</p>
                  <p>{isAdmin ? "관리자가 생성한 추모관은 선택한 공개 범위로 바로 게시됩니다." : "등록 요청 후 관리자가 확인합니다. 게시 후 내용 수정은 관리자에게 요청해 주세요."}</p>
                </StepGuide>

                {!isAdmin && (
                  <p className="mb-6 border-l-2 border-[#18181b] bg-[#f7f7f7] px-4 py-3 text-sm leading-6 text-[#414141]">
                    작성한 추모관은 관리자 확인을 거친 뒤 게시됩니다. 확인 전에는
                    검색 결과와 키오스크에 보이지 않습니다.
                  </p>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="공개 범위" required>
                    <div role="group" aria-label="공개 범위" className="grid gap-px border border-[#b5b0a7] bg-[#b5b0a7] sm:grid-cols-2">
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
                                : "text-[#616161] hover:bg-[#fafafa]"
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
                      {isAdmin
                        ? "전체 공개는 검색과 키오스크에도 표시됩니다. 비공개는 검색과 키오스크에서 제외됩니다."
                        : "관리자 확인 전에는 검색과 키오스크에 표시되지 않습니다. 비공개를 선택한 경우 확인 후에도 검색과 키오스크에서 제외됩니다."}
                    </p>
                  </Field>

                  {form.visibility === "private" && (
                    <Field
                      label="추모관 입장 비밀번호"
                      error={errors.accessPassword}
                      required
                      maxLength={80}
                      hint="방문자와 공유할 입장 비밀번호입니다. 회원 로그인·가족관 비밀번호와는 다릅니다. 쉬운 숫자나 생년월일은 피해 주세요."
                    >
                      <input
                        type="password"
                        autoComplete="new-password"
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
                {form.visibility === "private" && (
                  <p className="mt-5 border-l-2 border-[#968062] bg-[#f8f6f2] p-4 text-base leading-7 text-[#514a40]">현재 비공개 추모관도 주소를 알면 성함·직분·생몰연도·교회·한 줄 소개는 비밀번호 입력 전에 볼 수 있습니다. 본문을 열려면 입장 비밀번호가 필요합니다.</p>
                )}
                <div className="mt-8 border border-[#d5cfc5] bg-[#fcfbf8] p-4 md:p-6">
                  <h3 className="text-xl font-medium">등록 전, 한 번 더 확인해 주세요</h3>
                  <p className="my-4 text-base leading-7 text-[#616161]">고칠 내용은 각 항목의 ‘수정하기’를 누르세요. 입력한 글은 그대로 유지됩니다.</p>
                  <ReviewGroup title="기본 정보" onEdit={() => goToStep(0)}>
                    <ReviewValue label="성함 · 직분" value={[form.name, form.role].filter(Boolean).join(" · ") || "필수 항목을 입력해 주세요"} />
                    <ReviewValue label="출생일" value={form.birthDate || "필수 항목을 입력해 주세요"} />
                    <ReviewValue label="소천일" value={form.deathDate} />
                    <ReviewValue label="소속 교회" value={form.church || "소망교회"} />
                    <ReviewValue label="가족 대표" value={form.familyContact} />
                    <ReviewValue label="연락처" value={form.familyPhone} />
                    <ReviewValue label="예상 주소 (등록 시 확정)" value={`/memorial/${slugPreview}`} wide />
                  </ReviewGroup>
                  <ReviewGroup title="신앙 이야기" onEdit={() => goToStep(1)}>
                    <ReviewValue label="한 줄 소개" value={form.summary || "필수 항목을 입력해 주세요"} wide />
                    <ReviewValue label="삶의 기록" value={form.story || "필수 항목을 입력해 주세요"} wide />
                    <ReviewValue label="대표 말씀" value={form.verse} wide />
                    <ReviewValue label="말씀 출처" value={form.verseRef} />
                    <ReviewValue label="예배 일시" value={form.serviceTime.replace("T", " ")} />
                    <ReviewValue label="추도일" value={form.memorialDay} />
                  </ReviewGroup>
                  <ReviewGroup title="생애 기록" onEdit={() => goToStep(2)}>
                    <ReviewValue label="기억하고 싶은 일" wide value={timeline.filter(item => item.year.trim() || item.title.trim() || item.description.trim()).map(item => [item.year, item.title, item.description].filter(Boolean).join(" · ")).join("\n\n")} />
                  </ReviewGroup>
                  <div className="border-t border-[#d5cfc5] pt-5">
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <ReviewValue label="사진" value={isAdmin ? "생성 후 사진 추가하기" : "등록 요청 후, 관리자 확인 전에 직접 추가"} />
                      <ReviewValue label="공개 범위" value={form.visibility === "private" ? "비공개 · 본문에 입장 비밀번호 필요" : "전체 공개"} />
                      {form.visibility === "private" && <ReviewValue label="입장 비밀번호" value={form.accessPassword.trim() ? "입력됨 (임시저장되지 않음)" : "입력이 필요합니다"} />}
                      <ReviewValue label="등록 후 상태" value={isAdmin ? "바로 게시" : "관리자 확인 대기"} />
                    </dl>
                  </div>
                </div>
              </section>

              <section className="border border-[#b5b0a7] p-5 md:p-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <p className="text-sm font-medium text-[#121212]">
                      {submitted
                        ? "추모관이 생성되었습니다."
                        : "입력 내용을 확인해 주세요."}
                    </p>
                    <p role="status" aria-live="polite" className="mt-2 text-base leading-7 text-[#616161]">
                      {notice ||
                        (isLastStep ? "위의 입력 내용과 공개 범위를 확인한 뒤 등록해 주세요." : "선택 항목은 비워두어도 됩니다. 입력한 글은 이전·다음 단계로 이동해도 유지됩니다.")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={createMemorialMutation.isPending || submitted}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#b5b0a7] px-5 text-sm transition-colors hover:bg-[#f5f5f5]"
                    >
                      <Save className="h-4 w-4" strokeWidth={1.6} />
                      임시저장
                    </button>
                    {step > 0 ? (
                      <button
                        type="button"
                        onClick={() => goToStep(step - 1)}
                        className="inline-flex h-11 items-center justify-center gap-2 border border-[#b5b0a7] px-5 text-sm transition-colors hover:bg-[#f5f5f5]"
                      >
                        <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
                        이전
                      </button>
                    ) : (
                      <Link href="/">
                        <button
                          type="button"
                          className="h-11 w-full border border-[#b5b0a7] px-5 text-sm transition-colors hover:bg-[#f5f5f5] sm:w-auto"
                        >
                          홈으로
                        </button>
                      </Link>
                    )}
                    {isLastStep ? (
                      <button
                        key="submit-memorial"
                        type="submit"
                        disabled={createMemorialMutation.isPending || submitted}
                        className="inline-flex h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        {createMemorialMutation.isPending
                          ? "저장 중"
                          : submitted ? "등록 완료" : isAdmin ? "추모관 생성" : "관리자 확인 요청"}
                        <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                      </button>
                    ) : (
                      <button
                        key="next-step"
                        type="button"
                        onClick={event => {
                          event.preventDefault();
                          goNext();
                        }}
                        className="inline-flex h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        {step === 2 ? "다음 · 사진 안내" : step === 3 ? "다음 · 공개 설정" : "다음"}
                        <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              </fieldset>
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
                              : createdMemorial?.status === "pending"
                                ? "관리자 확인 중"
                              : createdMemorial?.status || "등록 완료"
                          }
                        />
                      </dl>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href={`/memorial/${createdMemorial?.slug}/archive#gallery`}>
                          <button type="button" className="inline-flex min-h-12 items-center justify-center border border-[#18181b] bg-[#f8f6f2] px-4 text-base font-medium">사진 추가하기</button>
                        </Link>
                        <Link href={createdMemorial?.href || "/"}>
                          <button type="button" className="inline-flex h-10 items-center justify-center gap-2 bg-[#18181b] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90">
                            추모관 보기
                            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                          </button>
                        </Link>
                        <Link href="/my/memorials">
                          <button type="button" className="inline-flex h-10 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                            내 추모관
                          </button>
                        </Link>
                        <Link
                          href={createdMemorial?.editHref || "/my/memorials"}
                        >
                          <button type="button" className="inline-flex h-10 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] transition-colors hover:bg-[#f5f5f5]">
                            이어서 수정
                          </button>
                        </Link>
                      </div>
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
    <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-[#b5b0a7] pb-5">
      <h2
        className="text-2xl font-normal"
        tabIndex={-1}
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
  hint,
  maxLength,
  count,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  count?: number;
}) {
  const id = useId();
  const isControl = isValidElement(children) && ["input", "textarea", "select"].includes(String(children.type));
  const descriptionIds = [hint && `${id}-hint`, error && `${id}-error`, count !== undefined && `${id}-count`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label className={labelClass} htmlFor={isControl ? id : undefined}>
        {label}
        <span className={`ml-2 text-sm ${required ? "text-[#775e3c]" : "font-normal text-[#616161]"}`}>{required ? "필수" : "선택"}</span>
      </label>
      {isControl ? cloneElement(children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>, {
        id, maxLength, "aria-required": required, "aria-describedby": descriptionIds,
      }) : children}
      {hint && <p id={`${id}-hint`} className="mt-2 text-sm leading-6 text-[#616161]">{hint}</p>}
      {count !== undefined && <p id={`${id}-count`} className="mt-2 text-sm text-[#616161]">{count.toLocaleString()} / {maxLength?.toLocaleString()}자</p>}
      {error && <p id={`${id}-error`} role="alert" className={`${errorClass} text-sm`}>{error}</p>}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[#b5b0a7] pt-3">
      <dt className="text-xs text-[#616161]">{label}</dt>
      <dd className="mt-1 break-all text-[#121212]">{value || "-"}</dd>
    </div>
  );
}
