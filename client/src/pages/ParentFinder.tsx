import { useAuth } from "@/_core/hooks/useAuth";
import { inputClass } from "@/lib/formStyles";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ORG_INFO } from "@/lib/orgInfo";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  HeartHandshake,
  MapPin,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";

type ParentSearchRecord = {
  id: number;
  name: string;
  role: string | null;
  affiliation: string | null;
  birthDate: string;
  deathDate: string;
  memorial: {
    state: "owned" | "public" | "restricted";
    href: string | null;
    editHref: string | null;
  } | null;
};

// Interment records store 0000-00-00 (or an empty value) when the birth date is
// unknown. Show a plain label instead of the placeholder in that case.
function formatBirthDate(value: string) {
  if (
    !value ||
    value.startsWith("0000") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "정보 없음";
  }
  return value;
}

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function ParentFinder() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const searchMutation = trpc.parentFinder.search.useMutation();
  const createMutation = trpc.parentFinder.createMemorial.useMutation();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [records, setRecords] = useState<ParentSearchRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [familyConfirmed, setFamilyConfirmed] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setNotice("부모님 성함을 두 글자 이상 입력해 주세요.");
      return;
    }

    try {
      setNotice("");
      setRecords([]);
      setHasSearched(false);
      const found = await searchMutation.mutateAsync({
        name: normalizedName,
        birthDate: birthDate || undefined,
      });
      setRecords(found as ParentSearchRecord[]);
      setHasSearched(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "부모님 정보를 찾지 못했습니다."
      );
      setHasSearched(true);
    }
  };

  const handleStartMemorial = async (record: ParentSearchRecord) => {
    if (!familyConfirmed) {
      setNotice(
        "위의 '꼭 확인해 주세요'를 읽고 확인 칸에 표시한 뒤 시작해 주세요."
      );
      return;
    }
    // 이름이 같은 다른 분의 추모관을 잘못 만들지 않게 한 번 더 묻는다 (2026-09-23).
    const lifespan = [
      formatBirthDate(record.birthDate),
      record.deathDate || "소천일 미상",
    ].join(" ~ ");
    if (
      !window.confirm(
        [
          `${record.name}${record.role ? ` ${record.role}` : ""} (${lifespan})`,
          "",
          "이분이 저의 부모님(가족)이 맞습니까?",
          "추모관은 한 분당 하나만 만들 수 있어, 잘못 만들면 실제 가족이 추모관을 만들 수 없게 됩니다.",
          "",
          `애매하시면 [취소]를 누르고 ${ORG_INFO.contactPhoneLabel}(${ORG_INFO.contactPhone})로 먼저 문의해 주세요.`,
        ].join("\n")
      )
    ) {
      return;
    }

    try {
      setNotice("");
      const result = await createMutation.mutateAsync({
        recordId: record.id,
        name: record.name,
        birthDate: birthDate || undefined,
        familyConfirmation: true,
      });

      if (result.kind === "created") {
        setLocation(result.editHref);
        return;
      }

      if (result.access === "owner" && result.editHref) {
        setLocation(result.editHref);
        return;
      }

      if (result.access === "public" && result.href) {
        setLocation(result.href);
        return;
      }

      setNotice(
        `다른 분이 이미 이분의 추모관을 준비하고 있습니다. 먼저 시작한 가족에게 '가족 초대' 링크를 받으시면 함께 관리할 수 있습니다. 우리 가족이 만든 것이 아니거나 연락이 닿지 않으면 ${ORG_INFO.contactPhoneLabel}(${ORG_INFO.contactPhone})로 알려 주세요.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "추모관을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  };

  if (loading) {
    return <StateScreen text="로그인 상태를 확인하고 있습니다." />;
  }

  if (!user) {
    return <StateScreen text="로그인 후 부모님을 찾을 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#b5b0a7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <Link href="/my/memorials">
                <button className="mb-8 inline-flex h-10 items-center gap-2 border border-[#b5b0a7] bg-white px-4 text-sm text-[#616161] transition-colors hover:text-[#121212]">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />내 추모관
                </button>
              </Link>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Somang Garden
              </p>
              <h1
                className="break-keep text-4xl font-normal leading-tight [overflow-wrap:anywhere] md:text-6xl"
                style={serifStyle}
              >
                우리 부모님 찾기
              </h1>
              <p className="mt-6 max-w-xl break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                교회에 등록된 부모님의 기록을 찾아, 필요한 정보가 채워진 비공개
                추모관을 시작할 수 있습니다.
              </p>
            </div>

            <aside className="border border-[#b5b0a7] bg-[#f7f7f7] p-6">
              <ShieldCheck
                className="h-5 w-5 text-[#121212]"
                strokeWidth={1.5}
              />
              <p className="mt-4 text-sm font-medium text-[#121212]">
                가족 확인 후 시작합니다
              </p>
              <p className="mt-2 break-keep text-xs leading-5 text-[#616161] [overflow-wrap:anywhere]">
                성함만으로 찾을 수 있으며, 생년월일도 입력하시면 찾으시는 분을
                더 정확히 확인할 수 있습니다. 전화번호와 연락처는 사용하지
                않습니다.
              </p>
            </aside>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-4xl">
            <form
              onSubmit={handleSearch}
              className="border border-[#b5b0a7] bg-white p-5 md:p-8"
            >
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#616161]">
                    부모님 성함
                  </span>
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    className={inputClass}
                    maxLength={120}
                    autoComplete="off"
                    placeholder="성함을 입력해 주세요"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#616161]">
                    생년월일 (선택)
                  </span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={event => setBirthDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={searchMutation.isPending}
                  className="inline-flex h-12 items-center justify-center gap-2 bg-[#18181b] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="h-4 w-4" strokeWidth={1.7} />
                  {searchMutation.isPending ? "찾는 중" : "우리 부모님 찾기"}
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#777]">
                성함이 같은 분이 여러 명이면 소천일자로 우리 부모님을 확인해
                주세요.
              </p>
            </form>

            {notice && (
              <div className="mt-5 border border-[#d8b3ad] bg-[#fff8f7] px-5 py-4 text-sm leading-6 text-[#7d3025]">
                {notice}
              </div>
            )}

            {hasSearched && records.length === 0 && !notice && (
              <div className="mt-6 border border-[#b5b0a7] py-14 text-center">
                <p className="text-sm text-[#616161]">
                  일치하는 등록 기록을 찾지 못했습니다.
                </p>
                <p className="mt-2 text-xs leading-5 text-[#777]">
                  성함을 다시 확인해 주세요. 그래도 없으시면{" "}
                  {ORG_INFO.contactPhoneLabel}({ORG_INFO.contactPhone})로 문의해
                  주세요.
                </p>
              </div>
            )}

            {records.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#121212]">
                  <HeartHandshake className="h-4 w-4" strokeWidth={1.7} />
                  확인된 부모님 기록
                </div>
                <div
                  className="mb-4 border border-[#d9b36c] bg-[#fffaf0] p-5 text-sm leading-6 text-[#4a3b1f]"
                  role="note"
                >
                  <p className="flex items-center gap-2 font-medium text-[#3a2e14]">
                    <TriangleAlert className="h-4 w-4" strokeWidth={1.8} />꼭
                    확인해 주세요
                  </p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 break-keep [overflow-wrap:anywhere]">
                    <li>
                      성함이 같은 분이 여러 분 계십니다.{" "}
                      <strong>생년월일과 소천일자</strong>가 우리 부모님과
                      같은지 반드시 확인해 주세요.
                    </li>
                    <li>
                      추모관은 <strong>한 분당 하나만</strong> 만들 수 있습니다.
                      다른 분의 추모관을 잘못 만들면 그 가족이 추모관을 만들 수
                      없게 됩니다.
                    </li>
                    <li>
                      가족이 아닌 분이 만든 추모관은 교회가 확인한 뒤 내리거나
                      실제 가족에게 넘길 수 있습니다.
                    </li>
                    <li>
                      <strong>
                        우리 부모님이 맞는지 애매하거나, 기록이 다르거나, 찾는
                        분이 없으면
                      </strong>{" "}
                      시작하기 전에 {ORG_INFO.contactPhoneLabel}(
                      <a
                        href={`tel:${ORG_INFO.contactPhone}`}
                        className="underline underline-offset-2"
                      >
                        {ORG_INFO.contactPhone}
                      </a>
                      )로 먼저 문의해 주세요.
                    </li>
                  </ul>
                  <label className="mt-4 flex items-start gap-3 border-t border-[#ead7ae] pt-4 font-medium text-[#3a2e14]">
                    <input
                      type="checkbox"
                      checked={familyConfirmed}
                      onChange={event =>
                        setFamilyConfirmed(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <span>
                      위 내용을 확인했으며, 제가 고른 분이 저의 부모님(가족)이
                      맞습니다.
                    </span>
                  </label>
                </div>
                <div className="space-y-4">
                  {records.map(record => (
                    <article
                      key={record.id}
                      className="border border-[#b5b0a7] bg-white p-5 md:p-6"
                    >
                      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h2
                              className="text-3xl font-normal"
                              style={serifStyle}
                            >
                              {record.name}
                            </h2>
                            <span className="text-sm text-[#616161]">
                              {record.role || "직분 정보 없음"}
                            </span>
                          </div>
                          <div className="mt-5 grid gap-3 text-sm text-[#444] sm:grid-cols-2">
                            <Meta
                              icon={<CalendarDays className="h-4 w-4" />}
                              label="소천일자"
                              value={record.deathDate}
                            />
                            <Meta
                              icon={<CalendarDays className="h-4 w-4" />}
                              label="생년월일"
                              value={formatBirthDate(record.birthDate)}
                            />
                            <Meta
                              icon={<MapPin className="h-4 w-4" />}
                              label="소속"
                              value={record.affiliation || "정보 없음"}
                            />
                          </div>
                        </div>

                        {record.memorial?.state === "owned" &&
                        record.memorial.editHref ? (
                          <Link href={record.memorial.editHref}>
                            <button className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#18181b] px-5 text-sm font-medium text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white md:w-auto">
                              내 추모관 수정
                              <ArrowRight
                                className="h-4 w-4"
                                strokeWidth={1.7}
                              />
                            </button>
                          </Link>
                        ) : record.memorial?.state === "public" &&
                          record.memorial.href ? (
                          <Link href={record.memorial.href}>
                            <button className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#18181b] px-5 text-sm font-medium text-[#121212] transition-colors hover:bg-[#18181b] hover:text-white md:w-auto">
                              추모관 보기
                              <ArrowRight
                                className="h-4 w-4"
                                strokeWidth={1.7}
                              />
                            </button>
                          </Link>
                        ) : record.memorial?.state === "restricted" ? (
                          <p className="max-w-48 text-xs leading-5 text-[#777]">
                            이미 다른 분이 추모관을 준비하고 있습니다. 우리
                            가족이 만든 것이 아니거나 함께 관리하고 싶으시면{" "}
                            {ORG_INFO.contactPhoneLabel}({ORG_INFO.contactPhone}
                            )로 알려 주세요.
                          </p>
                        ) : (
                          <button
                            type="button"
                            disabled={createMutation.isPending}
                            onClick={() => handleStartMemorial(record)}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                          >
                            {createMutation.isPending
                              ? "추모관 준비 중"
                              : "이분의 추모관 시작하기"}
                            <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#777]">{icon}</span>
      <div>
        <p className="text-[11px] text-[#777]">{label}</p>
        <p className="mt-0.5 text-sm text-[#121212]">{value}</p>
      </div>
    </div>
  );
}

function StateScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="container pt-32">
        <div className="border border-[#b5b0a7] py-20 text-center">
          <p className="text-sm text-[#616161]">{text}</p>
        </div>
      </main>
    </div>
  );
}
