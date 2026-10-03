import { trpc } from "@/lib/trpc";
import {
  KIOSK_ROTATE_DIRECTIONS,
  kioskDirectionLabel,
  kioskOrientationLabel,
  kioskRotateReasonLabel,
  type KioskRotateDirection,
} from "@shared/kioskDisplay";
import { RotateCcw, RotateCw, Smartphone } from "lucide-react";
import { useState } from "react";

/**
 * 관리자 → 키오스크 화면: "세로 고정" 켬/끔·방향과 키오스크가 알려 온 화면 상태
 * (2026-10-03, shared/kioskDisplay.ts).
 */

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : timeFormat.format(date);
}

/** 키오스크는 5분마다 알린다. 15분 넘게 소식이 없으면 꺼졌거나 끊긴 것이다. */
const STALE_AFTER_MS = 15 * 60 * 1000;

function isStale(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) || Date.now() - time > STALE_AFTER_MS;
}

export default function KioskDisplayPanel() {
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const displayQuery = trpc.kioskDisplay.adminGet.useQuery(undefined, {
    refetchInterval: 30 * 1000,
  });
  const update = trpc.kioskDisplay.adminUpdate.useMutation({
    onSuccess: async result => {
      setMessage(
        result.persisted
          ? "저장했습니다. 켜져 있는 키오스크는 보통 2분 안에 따라옵니다(인터넷이 끊겨 있으면 다시 이어진 뒤)."
          : "적용했지만 서버 파일에 저장하지 못했습니다. 서버를 다시 켜면 꺼진 상태로 돌아갑니다."
      );
      await Promise.all([
        utils.kioskDisplay.adminGet.invalidate(),
        utils.kioskDisplay.settings.invalidate(),
      ]);
    },
    onError: error => setMessage(error.message || "저장하지 못했습니다."),
  });

  const settings = displayQuery.data?.settings;
  const reports = displayQuery.data?.reports ?? [];
  const busy = update.isPending || !settings;

  function save(next: {
    portraitLock: boolean;
    direction: KioskRotateDirection;
  }) {
    setMessage("");
    update.mutate(next);
  }

  return (
    <section className="container py-10" aria-labelledby="kiosk-display-title">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#b5b0a7] pb-4">
        <h2
          id="kiosk-display-title"
          className="flex items-center gap-2 text-base font-medium"
        >
          <Smartphone className="h-4 w-4" strokeWidth={1.8} />
          키오스크 세로 고정
        </h2>
        <span className="text-sm text-[#616161]">
          {settings
            ? settings.portraitLock
              ? `켜짐 · ${kioskDirectionLabel(settings.direction)}`
              : "꺼짐"
            : "불러오는 중"}
        </span>
      </div>

      <p className="mt-4 max-w-2xl break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
        세로로 세운 키오스크 화면이 옆으로 누워 보이면 켜 주세요. 키오스크 창이
        가로일 때만 화면 전체를 90° 돌려 세로로 그립니다. 창이 이미 세로이면 켜
        두어도 아무것도 바뀌지 않습니다. 돌린 방향이 반대라 거꾸로 보이면 방향을
        바꿔 주세요.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="세로 고정 켬/끔"
          className="inline-flex border border-[#18181b]"
        >
          {[
            { value: true, label: "켬" },
            { value: false, label: "끔" },
          ].map(option => {
            const selected = settings?.portraitLock === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={selected}
                disabled={busy || selected}
                onClick={() =>
                  settings &&
                  save({
                    portraitLock: option.value,
                    direction: settings.direction,
                  })
                }
                className={`h-10 min-w-16 px-4 text-sm transition-colors disabled:cursor-default ${
                  selected
                    ? "bg-[#18181b] text-white"
                    : "bg-white text-[#121212] hover:bg-[#f5f5f5] disabled:opacity-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="돌리는 방향"
          className="inline-flex flex-wrap gap-2"
        >
          {KIOSK_ROTATE_DIRECTIONS.map(direction => {
            const selected = settings?.direction === direction;
            const Icon = direction === "ccw" ? RotateCcw : RotateCw;
            return (
              <button
                key={direction}
                type="button"
                aria-pressed={selected}
                disabled={busy || selected}
                onClick={() =>
                  settings &&
                  save({ portraitLock: settings.portraitLock, direction })
                }
                className={`inline-flex h-10 items-center gap-2 border px-3 text-sm transition-colors disabled:cursor-default ${
                  selected
                    ? "border-[#18181b] bg-[#f2f2f2] text-[#121212]"
                    : "border-[#b5b0a7] bg-white text-[#454545] hover:bg-[#f5f5f5] disabled:opacity-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {kioskDirectionLabel(direction)}으로 돌리기
                {direction === "ccw" ? " (기본)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <p className="mt-4 break-keep text-sm text-[#454545] [overflow-wrap:anywhere]">
          {message}
        </p>
      )}
      {displayQuery.data && !displayQuery.data.persisted && (
        <p className="mt-2 break-keep text-sm text-[#9f2a2a] [overflow-wrap:anywhere]">
          지금 설정은 서버 메모리에만 있습니다. 서버를 다시 켜면 꺼집니다.
        </p>
      )}
      {settings?.updatedAt && (
        <p className="mt-2 text-xs text-[#777]">
          마지막 변경 {formatTime(settings.updatedAt)}
        </p>
      )}

      <h3 className="mt-8 text-sm font-medium">키오스크가 알려 온 화면 상태</h3>
      <p className="mt-1 break-keep text-xs leading-5 text-[#777] [overflow-wrap:anywhere]">
        키오스크 주소(/kiosk)를 연 화면이 5분마다 스스로 알려 오는 참고
        정보입니다(로그인 없이 받으므로 확인된 기록은 아닙니다). 15분 넘게
        소식이 없으면 흐리게 보입니다. 서버를 다시 켜면 비었다가 몇 분 안에 다시
        채워집니다. 개인정보는 받지 않습니다.
      </p>
      {displayQuery.isLoading ? (
        <p className="mt-4 text-sm text-[#616161]">불러오는 중입니다.</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 border border-[#b5b0a7] px-4 py-6 text-center text-sm text-[#616161]">
          아직 알려 온 키오스크가 없습니다.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#b5b0a7] border-y border-[#b5b0a7]">
          {reports.map(report => (
            <li
              key={`${report.screenWidth}x${report.screenHeight}@${report.pixelRatio}|${report.browser}`}
              className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3 text-sm ${
                isStale(report.receivedAt) ? "opacity-50" : ""
              }`}
            >
              <span className="w-36 shrink-0 text-[#616161]">
                {formatTime(report.receivedAt)}
              </span>
              <span className="font-medium">
                {report.viewportWidth}×{report.viewportHeight}(
                {kioskOrientationLabel(
                  report.viewportWidth,
                  report.viewportHeight
                )}
                )
              </span>
              <span
                className={
                  report.rotation ? "text-[#121212]" : "text-[#616161]"
                }
              >
                {kioskRotateReasonLabel(report.reason)}
                {report.rotation
                  ? ` · ${kioskDirectionLabel(report.rotation)}`
                  : ""}
                {report.rotation && report.frameReady === false
                  ? " · 화면을 불러오는 중(계속 이러면 확인 필요)"
                  : ""}
              </span>
              <span className="text-xs text-[#777]">
                {report.browser} · 모니터 {report.screenWidth}×
                {report.screenHeight} · 배율 {report.pixelRatio}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
