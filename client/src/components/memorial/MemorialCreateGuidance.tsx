import type { ReactNode } from "react";

export function StepGuide({ children }: { children: ReactNode }) {
  return (
    <div className="mb-7 border-l-2 border-[#968062] bg-[#f8f6f2] px-4 py-4 text-base leading-7 text-[#514a40]">
      {children}
    </div>
  );
}

export function WritingExample({
  title = "작성 예시 보기",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="mb-6 rounded-sm border border-[#d5cfc5] bg-[#fcfbf8]">
      <summary className="min-h-12 cursor-pointer px-4 py-3 text-base font-medium text-[#514a40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514a40]">
        {title}
      </summary>
      <div className="space-y-3 border-t border-[#e4ded5] px-4 py-4 text-base leading-7 text-[#514a40]">
        {children}
      </div>
    </details>
  );
}

export function ReviewGroup({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[#d5cfc5] py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h4 className="font-medium text-[#302c27]">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${title} 수정하기`}
          className="min-h-11 shrink-0 px-3 text-sm text-[#514a40] underline underline-offset-4"
        >
          수정하기
        </button>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export function ReviewValue({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[#686057]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-base leading-7 text-[#302c27] [overflow-wrap:anywhere]">
        {value.trim() || "입력하지 않음 (선택 항목)"}
      </dd>
    </div>
  );
}
