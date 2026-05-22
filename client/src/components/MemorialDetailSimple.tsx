import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Calendar, Church, MapPin } from "lucide-react";
import { Link } from "wouter";

type TimelineItem = {
  year: string;
  title: string;
  desc: string;
};

type MemorialDetailSimpleProps = {
  person: {
    name: string;
    fullName: string;
    role: string;
    church: string;
    dates: string;
    photo: string;
    verse: string;
    verseRef: string;
    summary: string;
    stats: { label: string; value: string }[];
    timeline: TimelineItem[];
    messages: { name: string; body: string }[];
  };
};

export default function MemorialDetailSimple({ person }: MemorialDetailSimpleProps) {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        <section className="border-b border-[#dbdad7]">
          <div className="container py-8">
            <Link href="/">
              <button className="inline-flex h-10 items-center gap-2 border border-[#dbdad7] px-4 text-sm transition-colors hover:bg-[#f6f5f2]">
                <ArrowLeft className="h-4 w-4" />
                홈으로
              </button>
            </Link>
          </div>
        </section>

        <section className="border-b border-[#dbdad7]">
          <div className="container grid gap-10 py-12 md:grid-cols-[0.85fr_1.15fr] md:py-20">
            <div>
              <img
                src={person.photo}
                alt={person.fullName}
                className="aspect-[4/5] w-full max-w-md object-cover grayscale"
              />
            </div>

            <div className="flex flex-col justify-center">
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                In Memoriam
              </p>
              <h1
                className="text-4xl font-normal tracking-[-0.025em] md:text-6xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                {person.fullName}
              </h1>
              <div className="mt-6 grid gap-3 text-sm text-[#616161] sm:grid-cols-3">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {person.dates}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Church className="h-4 w-4" />
                  {person.church}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {person.role}
                </span>
              </div>
              <blockquote className="mt-10 border-l border-[#18181b] pl-5">
                <p
                  className="text-2xl font-normal leading-10 tracking-[-0.015em]"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  {person.verse}
                </p>
                <cite className="mt-4 block not-italic text-sm text-[#616161]">
                  {person.verseRef}
                </cite>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dbdad7] bg-[#f6f5f2]">
          <div className="container grid gap-10 py-12 md:grid-cols-[0.7fr_1.3fr] md:py-16">
            <div>
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Life And Faith
              </p>
              <h2
                className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                삶과 신앙
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-9 text-[#121212]">{person.summary}</p>
          </div>
        </section>

        <section className="border-b border-[#dbdad7]">
          <div className="container grid grid-cols-1 gap-px bg-[#dbdad7] md:grid-cols-3">
            {person.stats.map((stat) => (
              <div key={stat.label} className="bg-white p-6 md:p-8">
                <p className="text-sm text-[#616161]">{stat.label}</p>
                <p
                  className="mt-5 text-4xl font-normal"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-[#dbdad7] py-12 md:py-16">
          <div className="container grid gap-10 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Timeline
              </p>
              <h2
                className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                기억의 기록
              </h2>
            </div>
            <div className="border-t border-[#dbdad7]">
              {person.timeline.map((item) => (
                <article
                  key={`${item.year}-${item.title}`}
                  className="grid gap-5 border-b border-[#dbdad7] py-6 md:grid-cols-[120px_1fr]"
                >
                  <p className="text-sm text-[#616161]">{item.year}</p>
                  <div>
                    <h3
                      className="text-xl font-normal"
                      style={{ fontFamily: "'Noto Serif KR', serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#616161]">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                  Messages
                </p>
                <h2
                  className="text-3xl font-normal tracking-[-0.02em] md:text-5xl"
                  style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  남겨진 마음
                </h2>
              </div>
              <button className="hidden h-11 border border-[#dbdad7] px-5 text-sm transition-colors hover:bg-[#f6f5f2] md:inline-flex md:items-center">
                마음 남기기
              </button>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#dbdad7] md:grid-cols-3">
              {person.messages.map((message) => (
                <article key={message.name} className="bg-white p-6">
                  <p className="text-sm text-[#121212]">{message.name}</p>
                  <p className="mt-4 text-sm leading-7 text-[#616161]">{message.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
