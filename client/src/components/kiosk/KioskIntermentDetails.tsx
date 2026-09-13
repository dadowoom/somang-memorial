import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KioskInterment } from "@shared/kioskInterment";
import { Landmark, UserRound } from "lucide-react";

export function KioskIntermentDetails({
  record,
  onClose,
  onHome,
}: {
  record: KioskInterment | null;
  onClose: () => void;
  onHome: () => void;
}) {
  return (
    <Dialog
      open={Boolean(record)}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      {record && (
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] overflow-y-auto rounded-none p-6 sm:max-w-[680px] sm:p-10"
        >
          <div className="flex justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-14 border border-[#b5b0a7] px-5 text-lg"
            >
              검색 결과로
            </button>
            <button
              type="button"
              onClick={onHome}
              className="min-h-14 border border-[#b5b0a7] px-5 text-lg"
            >
              처음으로
            </button>
          </div>
          <div className="mx-auto my-5 flex h-40 w-32 flex-col items-center justify-center gap-3 bg-[#f5f3ef] text-[#777]">
            <UserRound
              aria-hidden="true"
              className="h-14 w-14"
              strokeWidth={1}
            />
            <span className="text-sm">기본 정보</span>
          </div>
          <DialogTitle
            className="text-center text-4xl leading-snug"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {record.name}
          </DialogTitle>
          {record.role && (
            <p className="text-center text-xl text-[#616161]">{record.role}</p>
          )}
          <DialogDescription className="text-center text-lg leading-8">
            {record.message}
          </DialogDescription>
          <dl className="my-4 divide-y divide-[#dedbd5] border-y border-[#dedbd5] text-lg">
            {[
              ["출생일", record.birthDate],
              ["소천일", record.deathDate],
              ["안장 장소", record.burialPlace || "안장 장소 미등록"],
              ["안장일", record.burialDate],
            ].map(
              ([label, value]) =>
                value && (
                  <div
                    key={label}
                    className="grid grid-cols-[6rem_1fr] gap-4 py-4"
                  >
                    <dt className="text-[#616161]">{label}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                )
            )}
          </dl>
          <p className="flex items-start gap-2 break-keep text-base leading-7 text-[#616161] [overflow-wrap:anywhere]">
            <Landmark aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
            교회에 등록된 고인의 기본 정보입니다. 이 화면에서는 사진과 삶의
            이야기가 제공되지 않습니다.
          </p>
        </DialogContent>
      )}
    </Dialog>
  );
}
