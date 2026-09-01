import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { isOrgInfoIncomplete } from "@/lib/orgInfo";
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
    <div className="min-h-screen bg-[#f9f9f9]">
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

        {/* 교회 정보가 아직 채워지지 않았다면 숨기지 않고 그대로 알립니다.
            빈칸을 아무 말 없이 두면 읽는 분이 잘못 이해합니다. */}
        {isOrgInfoIncomplete() ? (
          <p
            role="status"
            className="mt-8 border border-[#e0d4b8] bg-[#f5f5f5] px-5 py-4 text-sm leading-6 text-[#7a5c1e]"
          >
            일부 항목(교회 주소, 문의 연락처, 개인정보 보호책임자)은 아직 확인
            중이며 곧 채워집니다. 그 전에 문의하실 일이 있으면 교회 사무실로
            연락해 주십시오.
          </p>
        ) : null}

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
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
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
                className="border-b border-[#b5b0a7] py-3 pr-4 text-left font-medium text-[#121212]"
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
                  className="border-b border-[#e9e9e9] py-3 pr-4 align-top leading-6 text-[#4a4a4a]"
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
