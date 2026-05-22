import Footer from "@/components/Footer";
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
        <section className="border-b border-[#dbdad7]">
          <div className="container py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Memorials
              </p>
              <h1
                className="text-4xl font-normal tracking-[-0.025em] md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                추모관
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#616161]">
                고인의 성함을 입력하면 해당 추모관을 찾을 수 있습니다.
                전체 명단은 공개하지 않습니다.
              </p>
            </div>

            <div className="mt-10 max-w-3xl border border-[#dbdad7]">
              <label className="flex items-center gap-3 px-5 py-4">
                <Search
                  className="h-5 w-5 shrink-0 text-[#616161]"
                  strokeWidth={1.6}
                />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="고인 성함을 두 글자 이상 입력하세요"
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
                <p className="text-sm text-[#616161]">
                  {!canSearch
                    ? "성함을 입력하면 검색 결과가 표시됩니다."
                    : memorialsQuery.isLoading
                      ? "검색 중"
                      : `검색 결과 ${results.length}건`}
                </p>
              </div>
            </div>

            {!canSearch ? (
              <div className="border border-[#dbdad7] bg-[#faf9f6] px-5 py-14 text-center md:py-20">
                <p
                  className="text-2xl font-normal text-[#121212] md:text-3xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  찾고 싶은 분의 성함을 입력해주세요.
                </p>
                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#616161]">
                  가족과 지인이 필요한 순간에 조용히 찾아볼 수 있도록,
                  추모관은 검색을 통해서만 확인합니다.
                </p>
              </div>
            ) : memorialsQuery.isLoading ? (
              <div className="border border-[#dbdad7] py-20 text-center">
                <p className="text-sm text-[#616161]">
                  추모관을 검색하고 있습니다.
                </p>
              </div>
            ) : memorialsQuery.isError ? (
              <div className="border border-[#dbdad7] py-20 text-center">
                <p className="text-sm text-[#616161]">
                  추모관을 검색하지 못했습니다.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="border border-[#dbdad7] py-20 text-center">
                <p className="text-sm text-[#616161]">
                  일치하는 추모관이 없습니다.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border-y border-[#dbdad7]">
                <div className="hidden grid-cols-[150px_1.1fr_1fr_0.8fr_128px] border-b border-[#dbdad7] bg-[#f8f7f4] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#777] md:grid">
                  <span>Year</span>
                  <span>Name</span>
                  <span>Church</span>
                  <span>Role</span>
                  <span className="text-right">Link</span>
                </div>

                <div className="divide-y divide-[#dbdad7]">
                  {results.map(memorial => (
                    <article
                      key={memorial.slug}
                      className="grid gap-3 bg-white px-4 py-4 transition-colors hover:bg-[#faf9f6] md:grid-cols-[150px_1.1fr_1fr_0.8fr_128px] md:items-center md:px-5"
                    >
                      <p className="text-xs tracking-[0.1em] text-[#616161] md:text-sm">
                        {memorial.birthDate} - {memorial.deathDate}
                      </p>
                      <h2
                        className="flex flex-wrap items-center gap-2 text-2xl font-normal md:text-xl"
                        style={{ fontFamily: "'Noto Serif KR', serif" }}
                      >
                        <span>{memorial.name}</span>
                        {memorial.isPrivate && (
                          <span className="inline-flex items-center gap-1 border border-[#dbdad7] px-2 py-1 text-[11px] font-sans text-[#616161]">
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
                        <button className="group inline-flex h-10 w-fit items-center justify-center gap-2 border border-[#dbdad7] px-4 text-sm text-[#121212] transition-colors hover:border-[#18181b] md:ml-auto">
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
