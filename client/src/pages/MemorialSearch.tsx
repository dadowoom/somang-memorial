import Footer from "@/components/Footer";
import { formatLifespan } from "@/lib/lifespan";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function MemorialSearch() {
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const canSearch = keyword.length >= 2;
  const memorialsQuery = trpc.memorial.search.useQuery(
    { keyword },
    { enabled: canSearch }
  );
  const results = memorialsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#b5b0a7]">
          <div className="container py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Memorials
              </p>
              <h1
                className="text-balance break-keep text-4xl font-normal tracking-[-0.025em] [overflow-wrap:anywhere] md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                추모관 찾기
              </h1>
              <p className="mt-6 max-w-xl text-pretty break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                고인의 성함으로 추모관을 찾아보세요.
                전체 명단은 공개하지 않습니다.
              </p>
            </div>

            <div className="mt-10 max-w-3xl border border-[#b5b0a7]">
              <label className="flex items-center gap-3 px-5 py-4">
                <Search
                  className="h-5 w-5 shrink-0 text-[#616161]"
                  strokeWidth={1.6}
                />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="고인의 성함 (두 글자 이상)"
                  className="h-10 min-w-0 flex-1 bg-transparent text-base text-[#121212] outline-none placeholder:text-[#9a9a9a]"
                  autoFocus
                />
              </label>
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-pretty break-keep text-sm text-[#616161] [overflow-wrap:anywhere]">
                  {!canSearch
                    ? "성함을 두 글자 이상 입력하면 검색 결과가 표시됩니다."
                    : memorialsQuery.isLoading
                      ? "검색 중"
                      : `검색 결과 ${results.length}건`}
                </p>
              </div>
            </div>

            {!canSearch ? (
              <div className="border border-[#b5b0a7] bg-[#fafafa] px-5 py-14 text-center md:py-20">
                <p
                  className="text-balance break-keep text-2xl font-normal text-[#121212] [overflow-wrap:anywhere] md:text-3xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  찾고 싶은 분의 성함을 입력해 주세요.
                </p>
                <p className="mx-auto mt-5 max-w-md text-pretty break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                  가족과 지인이 필요한 순간에 조용히 찾아볼 수 있도록,
                  추모관은 성함으로 검색할 수 있습니다.
                </p>
              </div>
            ) : memorialsQuery.isLoading ? (
              <div className="border border-[#b5b0a7] py-20 text-center">
                <p className="text-sm text-[#616161]">
                  추모관을 검색하고 있습니다.
                </p>
              </div>
            ) : memorialsQuery.isError ? (
              <div className="border border-[#b5b0a7] py-20 text-center">
                <p className="text-pretty break-keep px-5 text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                  추모관을 검색하지 못했습니다. 잠시 후 다시 확인해 주세요.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="border border-[#b5b0a7] py-20 text-center">
                <p className="text-pretty break-keep px-5 text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                  입력하신 성함으로는 추모관을 찾지 못했습니다. 성함을 다시 확인해
                  주세요.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border-y border-[#b5b0a7]">
                <div className="hidden grid-cols-[150px_1.1fr_1fr_0.8fr_128px] border-b border-[#b5b0a7] bg-[#f7f7f7] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777] md:grid">
                  <span>생애</span>
                  <span>성함</span>
                  <span>교회</span>
                  <span>직분</span>
                  <span className="text-right">추모관</span>
                </div>

                <div className="divide-y divide-[#b5b0a7]">
                  {results.map(memorial => (
                    <article
                      key={memorial.slug}
                      className="grid gap-3 bg-white px-4 py-4 transition-colors hover:bg-[#fafafa] md:grid-cols-[150px_1.1fr_1fr_0.8fr_128px] md:items-center md:px-5"
                    >
                      <p className="text-xs tracking-[0.1em] text-[#616161] md:text-sm">
                        {formatLifespan(memorial.birthDate, memorial.deathDate)}
                      </p>
                      <h2
                        className="flex flex-wrap items-center gap-2 text-2xl font-normal md:text-xl"
                        style={{ fontFamily: "'Noto Serif KR', serif" }}
                      >
                        <span>{memorial.name}</span>
                        {memorial.isPrivate && (
                          <span className="inline-flex items-center gap-1 border border-[#b5b0a7] px-2 py-1 text-[11px] font-sans text-[#616161]">
                            <LockKeyhole className="h-3 w-3" />
                            비공개
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-[#616161]">
                        {memorial.church}
                      </p>
                      <p className="text-sm text-[#616161]">{memorial.role}</p>
                      <Link href={memorial.href}>
                        <button className="group inline-flex h-10 w-fit items-center justify-center gap-2 border border-[#b5b0a7] px-4 text-sm text-[#121212] transition-colors hover:border-[#18181b] md:ml-auto">
                          {memorial.isPrivate ? "비밀번호 입력" : "추모관 보기"}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      </Link>
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
