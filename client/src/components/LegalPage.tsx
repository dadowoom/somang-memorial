import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  intro: string;
  children: ReactNode;
};

/** 개인정보처리방침·이용약관처럼 글이 길고 구조가 같은 문서 페이지의 틀입니다. */
export default function LegalPage({
  eyebrow,
  title,
  effectiveDate,
  intro,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Navbar />
      <main className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          {eyebrow}
        </p>
        <h1 className="mt-5 text-[32px] font-light leading-tight text-[#121212] sm:text-[40px]">
          {title}
        </h1>
        <p className="mt-6 text-sm leading-7 text-[#616161]">{intro}</p>
        <p className="mt-4 text-xs text-[#8a8a8a]">시행일 {effectiveDate}</p>

        <div className="mt-14 space-y-12">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="border-b border-[#e5e3df] pb-3 text-lg font-medium text-[#121212]">
        {heading}
      </h2>
      <div className="mt-5 space-y-4 text-sm leading-7 text-[#4a4a4a]">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[10px] size-1 shrink-0 rounded-full bg-[#c4c1bb]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse text-sm">
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column}
                scope="col"
                className="border-b border-[#dbdad7] py-3 pr-4 text-left font-medium text-[#121212]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[#eceae6] py-3 pr-4 align-top leading-6 text-[#4a4a4a]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
