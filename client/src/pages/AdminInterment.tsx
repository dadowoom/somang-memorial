import { useAuth } from "@/_core/hooks/useAuth";
import AdminNavigation from "@/components/admin/AdminNavigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { inputClass } from "@/lib/formStyles";
import { trpc } from "@/lib/trpc";
import {
  cleanIntermentFields,
  INTERMENT_FIELD_LABELS,
  type IntermentAdminFields,
  UNKNOWN_DATE,
} from "@shared/intermentAdmin";
import { BookUser, Plus, Search } from "lucide-react";
import { type FormEvent, useState } from "react";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const subtleButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[#b5b0a7] px-4 text-sm text-[#121212] hover:bg-[#f5f5f5] disabled:opacity-50";

const EMPTY_FIELDS: IntermentAdminFields = {
  name: "",
  role: "",
  affiliation: "",
  pastor: "",
  funeralChurch: "",
  birthDate: "",
  deathDate: "",
  deathAge: "",
  burialPlace: "",
  burialDate: "",
};

const FIELD_ORDER: (keyof IntermentAdminFields)[] = [
  "name",
  "role",
  "birthDate",
  "deathDate",
  "deathAge",
  "burialPlace",
  "burialDate",
  "affiliation",
  "pastor",
  "funeralChurch",
];

const FIELD_HINTS: Partial<Record<keyof IntermentAdminFields, string>> = {
  name: "명단에 적힌 그대로 (예: 김소망 권사(타)). 화면에는 직분 표시를 떼고 보입니다.",
  birthDate: "1933-01-05 처럼. 연도만 알면 1933, 모르면 비워 두세요.",
  deathDate: "2020-05-22 처럼. 모르면 비워 두세요.",
  burialDate: "모르면 비워 두세요.",
  burialPlace:
    "원문 그대로 적어도 됩니다. 공개 화면에는 ‘소망동산’ 또는 ‘다른 장지’로만 보입니다.",
};

type AdminIntermentRecord = {
  id: number;
  sourceId: number;
  name: string;
  role: string | null;
  affiliation: string | null;
  pastor: string | null;
  funeralChurch: string | null;
  birthDate: string;
  deathDate: string;
  deathAge: string | null;
  burialPlace: string;
  burialDate: string | null;
  memorialSlug: string | null;
  memorialName: string | null;
};

/** 0000-00-00 은 빈칸으로 보인다. 저장할 때 다시 0000-00-00 이 된다. */
function dateForInput(value: string | null) {
  return !value || value === UNKNOWN_DATE ? "" : value;
}

function dateForDisplay(value: string | null) {
  if (!value || value === UNKNOWN_DATE) return "모름";
  if (value.endsWith("-00-00")) return `${value.slice(0, 4)}년`;
  return value;
}

function toFields(record: AdminIntermentRecord): IntermentAdminFields {
  return {
    name: record.name,
    role: record.role ?? "",
    affiliation: record.affiliation ?? "",
    pastor: record.pastor ?? "",
    funeralChurch: record.funeralChurch ?? "",
    birthDate: dateForInput(record.birthDate),
    deathDate: dateForInput(record.deathDate),
    deathAge: record.deathAge ?? "",
    burialPlace: record.burialPlace,
    burialDate: dateForInput(record.burialDate),
  };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

/**
 * 관리자 화면에서 안장 기록 고치기 (2026-09-23). 교회에서 명단 수정 요청이 오면
 * 여기서 찾아 고친다. 전에는 다도움이 DB 를 직접 고쳤다.
 */
export default function AdminInterment() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [keyword, setKeyword] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const searchQuery = trpc.intermentAdmin.search.useQuery(
    { keyword: submitted },
    { enabled: user?.role === "admin" && submitted.length > 0 }
  );
  const update = trpc.intermentAdmin.update.useMutation();
  const create = trpc.intermentAdmin.create.useMutation();
  const remove = trpc.intermentAdmin.delete.useMutation();
  const records = (searchQuery.data ?? []) as AdminIntermentRecord[];

  const refresh = () => utils.intermentAdmin.search.invalidate();

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setEditingId(null);
    setSubmitted(keyword.trim());
  }

  async function handleUpdate(id: number, fields: IntermentAdminFields) {
    setMessage("");
    const result = await update.mutateAsync({ id, fields });
    await refresh();
    setEditingId(null);
    setMessage(
      result.changes.length === 0
        ? "바뀐 칸이 없어 그대로 두었습니다."
        : `고쳤습니다. ${result.changes.join(" / ")}`
    );
  }

  async function handleCreate(fields: IntermentAdminFields) {
    setMessage("");
    await create.mutateAsync({ fields });
    setCreating(false);
    setKeyword(fields.name.trim());
    setSubmitted(fields.name.trim());
    await refresh();
    setMessage(`${fields.name.trim()} 님 기록을 새로 넣었습니다.`);
  }

  async function handleDelete(record: AdminIntermentRecord) {
    setMessage("");
    if (
      !window.confirm(
        `${record.name} (${dateForDisplay(record.birthDate)} ~ ${dateForDisplay(
          record.deathDate
        )}) 기록을 지울까요? 지운 기록은 되살릴 수 없습니다. 같은 분이 두 번 들어간 경우처럼 잘못 들어간 기록만 지워 주세요.`
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync({ id: record.id });
      await refresh();
      setMessage(`${record.name} 님 기록을 지웠습니다.`);
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  if (loading) return <StateScreen text="관리자 권한을 확인하고 있습니다." />;
  if (user?.role !== "admin") {
    return <StateScreen text="관리자만 접근할 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="pt-16 lg:pl-60">
        <AdminNavigation />

        <section className="border-b border-[#b5b0a7]">
          <div className="container py-12 md:py-16">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
              Interment Records
            </p>
            <h1
              className="break-keep text-4xl font-normal leading-tight md:text-5xl"
              style={serifStyle}
            >
              안장 기록
            </h1>
            <p className="mt-6 max-w-2xl break-keep text-sm leading-7 text-[#616161]">
              키오스크 검색과 ‘부모님 찾기’가 쓰는 소천자·안장 명단입니다.
              교회에서 성함이나 날짜를 바로잡아 달라는 요청이 오면 여기서 찾아
              고쳐 주세요. 고친 내용은 바로 키오스크에 나오고, 누가 무엇을
              고쳤는지 관리 기록에 남습니다.
            </p>
          </div>
        </section>

        <section className="container py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <form
              onSubmit={handleSearch}
              className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            >
              <label className="flex-1">
                <span className="sr-only">성함으로 찾기</span>
                <input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder="성함으로 찾기 (예: 김소망)"
                  className={inputClass}
                  maxLength={60}
                />
              </label>
              <button
                type="submit"
                className={buttonClass}
                disabled={!keyword.trim()}
              >
                <Search className="h-4 w-4" strokeWidth={1.8} />
                찾기
              </button>
            </form>
            <button
              type="button"
              className={subtleButtonClass}
              onClick={() => {
                setCreating(value => !value);
                setMessage("");
              }}
              aria-expanded={creating}
            >
              <Plus className="h-4 w-4" strokeWidth={1.8} />새 기록 넣기
            </button>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="mt-6 border border-[#d5cfc5] bg-[#fcfbf8] px-4 py-3 text-sm leading-6"
            >
              {message}
            </p>
          )}

          {creating && (
            <div className="mt-6 border border-[#18181b] p-5">
              <h2 className="text-base font-medium">새 기록 넣기</h2>
              <p className="mt-1 text-sm text-[#616161]">
                명단에 없는 분을 교회가 알려 주셨을 때 넣습니다. 먼저 찾기로
                이미 있는지 확인해 주세요.
              </p>
              <RecordForm
                initial={EMPTY_FIELDS}
                submitLabel="넣기"
                busy={create.isPending}
                onCancel={() => setCreating(false)}
                onSubmit={handleCreate}
              />
            </div>
          )}

          <div className="mt-8 border-b border-[#b5b0a7] pb-3 text-sm text-[#616161]">
            {submitted
              ? searchQuery.isLoading
                ? "찾고 있습니다."
                : `‘${submitted}’ ${records.length}건${
                    records.length === 50
                      ? " (50건까지 보입니다. 더 자세히 찾아 주세요)"
                      : ""
                  }`
              : "성함으로 찾으면 여기에 나옵니다."}
          </div>

          <ul className="divide-y divide-[#e4ded5]">
            {records.map(record => (
              <li key={record.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-medium">
                      {record.name}
                      {record.role && (
                        <span className="ml-2 text-sm font-normal text-[#616161]">
                          {record.role}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-[#616161]">
                      {dateForDisplay(record.birthDate)} ~{" "}
                      {dateForDisplay(record.deathDate)}
                      {record.deathAge ? ` · 향년 ${record.deathAge}` : ""}
                    </p>
                    <p className="mt-1 break-all text-sm text-[#616161]">
                      장지: {record.burialPlace || "(없음)"}
                      {record.burialDate &&
                        record.burialDate !== UNKNOWN_DATE &&
                        ` · 안장 ${record.burialDate}`}
                    </p>
                    {record.memorialSlug && (
                      <p className="mt-2 inline-block border border-[#b5b0a7] px-2 py-0.5 text-xs text-[#616161]">
                        추모관 있음: {record.memorialName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={subtleButtonClass}
                      onClick={() => {
                        setEditingId(
                          editingId === record.id ? null : record.id
                        );
                        setMessage("");
                      }}
                      aria-expanded={editingId === record.id}
                    >
                      고치기
                    </button>
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={
                        Boolean(record.memorialSlug) || remove.isPending
                      }
                      title={
                        record.memorialSlug
                          ? "이 기록으로 만든 추모관이 있어 지울 수 없습니다."
                          : undefined
                      }
                      onClick={() => void handleDelete(record)}
                    >
                      지우기
                    </button>
                  </div>
                </div>
                {editingId === record.id && (
                  <div className="mt-4 border border-[#d5cfc5] bg-[#fcfbf8] p-5">
                    {record.memorialSlug && (
                      <p className="mb-3 text-sm leading-6 text-[#616161]">
                        이 기록으로 만든 추모관이 있습니다. 여기서 고쳐도
                        추모관에 적힌 성함·날짜는 바뀌지 않으니, 필요하면
                        추모관도 따로 고쳐 주세요.
                      </p>
                    )}
                    <RecordForm
                      initial={toFields(record)}
                      submitLabel="저장"
                      busy={update.isPending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={fields => handleUpdate(record.id, fields)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function RecordForm({
  initial,
  submitLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: IntermentAdminFields;
  submitLabel: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (fields: IntermentAdminFields) => Promise<void>;
}) {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof IntermentAdminFields, string>>
  >({});
  const [failure, setFailure] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure("");
    const checked = cleanIntermentFields(fields);
    setErrors(checked.errors);
    if (!checked.value) return;
    try {
      await onSubmit(fields);
    } catch (error) {
      setFailure(errorText(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELD_ORDER.map(key => (
          <label key={key} className="block">
            <span className="text-sm font-medium text-[#121212]">
              {INTERMENT_FIELD_LABELS[key]}
              {key === "name" && <span className="text-[#a3322b]"> *</span>}
            </span>
            <input
              value={fields[key]}
              onChange={event =>
                setFields(current => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className={`mt-1 ${inputClass}`}
              aria-invalid={Boolean(errors[key])}
            />
            {errors[key] ? (
              <span className="mt-1 block text-xs leading-5 text-[#a3322b]">
                {errors[key]}
              </span>
            ) : (
              FIELD_HINTS[key] && (
                <span className="mt-1 block text-xs leading-5 text-[#8a8a8a]">
                  {FIELD_HINTS[key]}
                </span>
              )
            )}
          </label>
        ))}
      </div>
      {failure && (
        <p role="alert" className="mt-4 text-sm text-[#a3322b]">
          {failure}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button type="submit" className={buttonClass} disabled={busy}>
          {submitLabel}
        </button>
        <button type="button" className={subtleButtonClass} onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}

function StateScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16 lg:pl-60">
        <AdminNavigation />
        <div className="container py-24 text-center text-sm text-[#616161]">
          <BookUser className="mx-auto mb-4 h-6 w-6" strokeWidth={1.5} />
          {text}
        </div>
      </main>
      <Footer />
    </div>
  );
}
