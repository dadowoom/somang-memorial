import { trpc } from "@/lib/trpc";
import {
  isKioskRotationFrame,
  kioskFrameSource,
  readCachedKioskDisplaySettings,
  readKioskRotateOverride,
  writeCachedKioskDisplaySettings,
} from "@/lib/kioskFrame";
import {
  decideKioskRotation,
  kioskRotationFrameStyle,
  summarizeUserAgent,
  type KioskRotateDecision,
  type KioskRotateDirection,
} from "@shared/kioskDisplay";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

/**
 * 키오스크 세로 고정 (2026-10-03). shared/kioskDisplay.ts 와 lib/kioskFrame.ts 참고.
 *
 * - 틀 안이면: 아무것도 하지 않고 화면을 그대로 그린다.
 * - 바깥 창이면: 서버 설정을 읽고(처음 열 때 + 2분마다), 설정이 켜져 있고 창이
 *   가로이면 화면을 틀에 담아 돌린다. 창이 세로이면 지금까지와 똑같이 그린다.
 * - 바깥 창은 화면 크기·방향·적용 여부·브라우저 종류를 서버에 알린다(5분마다).
 */

const SETTINGS_REFRESH_MS = 2 * 60 * 1000;
const REPORT_INTERVAL_MS = 5 * 60 * 1000;
const REPORT_SETTLE_MS = 1500;

export default function KioskPortraitLock({
  children,
}: {
  children: ReactNode;
}) {
  const [inFrame] = useState(() => isKioskRotationFrame());
  if (inFrame) return <>{children}</>;
  return <KioskPortraitLockTop>{children}</KioskPortraitLockTop>;
}

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function useViewportSize() {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const update = () => {
      const next = readViewport();
      setViewport(current =>
        current.width === next.width && current.height === next.height
          ? current
          : next
      );
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return viewport;
}

function KioskPortraitLockTop({ children }: { children: ReactNode }) {
  const [override] = useState(() =>
    readKioskRotateOverride(window.location.search)
  );
  const [cached] = useState(() => readCachedKioskDisplaySettings());
  const viewport = useViewportSize();
  const settingsQuery = trpc.kioskDisplay.settings.useQuery(undefined, {
    retry: 1,
    networkMode: "always",
    staleTime: SETTINGS_REFRESH_MS / 2,
    refetchInterval: SETTINGS_REFRESH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const settings = settingsQuery.data ?? cached;

  useEffect(() => {
    if (settingsQuery.data) writeCachedKioskDisplaySettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const decision = decideKioskRotation({
    settings,
    override,
    width: viewport.width,
    height: viewport.height,
  });
  // 설정을 아직 모르면(처음 켠 기기, 서버 답 전) 보고를 미룬다.
  const settled =
    Boolean(settingsQuery.data) || settingsQuery.isError || cached !== null;
  useKioskDisplayReport(decision, viewport, settled);

  if (!decision.rotation) return <>{children}</>;
  return <KioskRotatedFrame rotation={decision.rotation} viewport={viewport} />;
}

function KioskRotatedFrame({
  rotation,
  viewport,
}: {
  rotation: KioskRotateDirection;
  viewport: { width: number; height: number };
}) {
  // 돌리기 시작한 순간의 화면을 담는다. 방향이 바뀌어도 틀은 그대로 두고
  // 돌리는 각도만 바꾼다(손님이 쓰던 화면이 처음으로 돌아가지 않게).
  const [source] = useState(() => kioskFrameSource(window.location));

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <div
      data-kiosk-rotation={rotation}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <iframe
        title="소망 추모관 키오스크"
        src={source}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          border: 0,
          display: "block",
          background: "#fff",
          ...kioskRotationFrameStyle(rotation, viewport),
        }}
      />
    </div>
  );
}

function useKioskDisplayReport(
  decision: KioskRotateDecision,
  viewport: { width: number; height: number },
  settled: boolean
) {
  const utils = trpc.useUtils();
  const latest = useRef({ decision, viewport });
  latest.current = { decision, viewport };

  const send = useRef(() => {
    const { decision: current, viewport: size } = latest.current;
    void utils.client.kioskDisplay.report
      .mutate({
        viewportWidth: Math.round(size.width),
        viewportHeight: Math.round(size.height),
        screenWidth: Math.round(window.screen?.width ?? 0),
        screenHeight: Math.round(window.screen?.height ?? 0),
        pixelRatio: Math.min(16, window.devicePixelRatio || 1),
        rotation: current.rotation,
        reason: current.reason,
        browser: summarizeUserAgent(navigator.userAgent),
      })
      .catch(() => {
        // 알림은 덤이다. 실패해도 화면에는 아무 영향이 없다.
      });
  });

  const signature = `${decision.rotation}|${decision.reason}|${viewport.width}x${viewport.height}`;
  useEffect(() => {
    if (!settled) return;
    const timer = window.setTimeout(() => send.current(), REPORT_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [signature, settled]);

  useEffect(() => {
    if (!settled) return;
    const timer = window.setInterval(
      () => send.current(),
      REPORT_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [settled]);
}
