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

export const KIOSK_ROTATION_FRAME_CLASS = "kiosk-rotation-frame";
const KIOSK_FRAME_READY_FLAG = "__somangKioskFrameReady";
const SETTINGS_REFRESH_MS = 2 * 60 * 1000;
const REPORT_INTERVAL_MS = 5 * 60 * 1000;
const REPORT_SETTLE_MS = 1500;

export default function KioskPortraitLock({
  children,
}: {
  children: ReactNode;
}) {
  const [inFrame] = useState(() => isKioskRotationFrame());
  if (inFrame)
    return <KioskRotationFrameContent>{children}</KioskRotationFrameContent>;
  return <KioskPortraitLockTop>{children}</KioskPortraitLockTop>;
}

/** 틀 안: 다시 돌리지 않고, 돌린 화면의 손가락 스크롤만 맞춘다(index.css). */
function KioskRotationFrameContent({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const win = window as Window & { [KIOSK_FRAME_READY_FLAG]?: boolean };
    root.classList.add(KIOSK_ROTATION_FRAME_CLASS);
    // 바깥 창이 "틀 안 화면이 떴다"를 확인하는 표시.
    win[KIOSK_FRAME_READY_FLAG] = true;
    return () => {
      root.classList.remove(KIOSK_ROTATION_FRAME_CLASS);
      win[KIOSK_FRAME_READY_FLAG] = false;
    };
  }, []);
  return <>{children}</>;
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
  // 돌린 틀 안의 화면이 다 떴는지. 돌리지 않을 때는 의미가 없다.
  const [frameReady, setFrameReady] = useState(false);
  // 설정을 아직 모르면(처음 켠 기기, 서버 답 전) 보고를 미룬다.
  const settled =
    Boolean(settingsQuery.data) || settingsQuery.isError || cached !== null;
  useKioskDisplayReport(
    decision,
    viewport,
    decision.rotation ? frameReady : null,
    settled
  );

  if (!decision.rotation) return <>{children}</>;
  return (
    <KioskRotatedFrame
      rotation={decision.rotation}
      viewport={viewport}
      onReadyChange={setFrameReady}
    />
  );
}

/** 틀 안의 화면이 이 시간 안에 뜨지 않으면 틀을 다시 불러온다(두 배씩 늘림). */
const FRAME_READY_TIMEOUT_MS = 20 * 1000;
const FRAME_READY_TIMEOUT_MAX_MS = 5 * 60 * 1000;
const FRAME_CHECK_MS = 2 * 1000;

function isFrameAppReady(frame: HTMLIFrameElement | null) {
  try {
    const win = frame?.contentWindow as
      | (Window & { [KIOSK_FRAME_READY_FLAG]?: boolean })
      | null
      | undefined;
    return win?.[KIOSK_FRAME_READY_FLAG] === true;
  } catch {
    // 오류 화면(다른 출처)이면 읽을 수 없다 = 뜨지 않은 것.
    return false;
  }
}

function KioskRotatedFrame({
  rotation,
  viewport,
  onReadyChange,
}: {
  rotation: KioskRotateDirection;
  viewport: { width: number; height: number };
  onReadyChange: (ready: boolean) => void;
}) {
  // 돌리기 시작한 순간의 화면을 담는다. 방향이 바뀌어도 틀은 그대로 두고
  // 돌리는 각도만 바꾼다(손님이 쓰던 화면이 처음으로 돌아가지 않게).
  const [source] = useState(() => kioskFrameSource(window.location));
  // 틀이 뜨지 않으면(회선이 잠깐 끊긴 순간에 돌리기 시작한 경우 등) 바깥 창에는
  // 스스로 새로고침하는 장치가 없다. 여기서 지켜보다 다시 불러온다.
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const timeout = Math.min(
      FRAME_READY_TIMEOUT_MS * 2 ** attempt,
      FRAME_READY_TIMEOUT_MAX_MS
    );
    let notReadySince = Date.now();
    let lastReady: boolean | null = null;
    const check = () => {
      const ready = isFrameAppReady(frameRef.current);
      if (ready !== lastReady) {
        lastReady = ready;
        onReadyChange(ready);
      }
      if (ready) {
        notReadySince = Date.now();
        return;
      }
      if (Date.now() - notReadySince >= timeout && navigator.onLine !== false) {
        setAttempt(current => current + 1);
      }
    };
    const timer = window.setInterval(check, FRAME_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [attempt, onReadyChange]);

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
        key={attempt}
        ref={frameRef}
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
  frameReady: boolean | null,
  settled: boolean
) {
  const utils = trpc.useUtils();
  const latest = useRef({ decision, viewport, frameReady });
  latest.current = { decision, viewport, frameReady };

  const send = useRef(() => {
    const {
      decision: current,
      viewport: size,
      frameReady: ready,
    } = latest.current;
    void utils.client.kioskDisplay.report
      .mutate({
        viewportWidth: Math.round(size.width),
        viewportHeight: Math.round(size.height),
        screenWidth: Math.round(window.screen?.width ?? 0),
        screenHeight: Math.round(window.screen?.height ?? 0),
        pixelRatio: Math.min(16, window.devicePixelRatio || 1),
        rotation: current.rotation,
        reason: current.reason,
        frameReady: ready,
        browser: summarizeUserAgent(navigator.userAgent),
      })
      .catch(() => {
        // 알림은 덤이다. 실패해도 화면에는 아무 영향이 없다.
      });
  });

  const signature = `${decision.rotation}|${decision.reason}|${frameReady}|${viewport.width}x${viewport.height}`;
  useEffect(() => {
    if (!settled) return;
    const timer = window.setTimeout(() => send.current(), REPORT_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [signature, settled]);

  useEffect(() => {
    if (!settled) return;
    const timer = window.setInterval(() => send.current(), REPORT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [settled]);
}
