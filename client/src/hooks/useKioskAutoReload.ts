import { useEffect, useRef } from "react";
import {
  KIOSK_BUILD_CHECK_INTERVAL_MS,
  KIOSK_RELOAD_TICK_MS,
  currentEntryBundle,
  decideKioskReload,
  extractEntryBundle,
} from "@/lib/kioskAutoReload";

/**
 * 아무도 새로고침을 눌러 주지 않는 키오스크가 스스로 새로고침하게 한다.
 * - 5분마다 서버의 index.html 을 읽어 화면 묶음 파일 이름을 비교한다.
 *   달라졌으면 새 배포가 있는 것이고, 손님이 쓰는 중이 아닐 때 새로고침한다.
 * - 매일 새벽 4시대에, 12시간 이상 켜져 있었으면 한 번 새로고침한다.
 * - 인터넷이 끊겨 있으면 하지 않는다. 개발 서버(해시 파일 없음)에서는 꺼진다.
 *
 * @param idle 손님이 쓰는 중이 아니면 true (광고 화면, 또는 아무것도 입력하지 않은 검색 화면)
 */
export function useKioskAutoReload(idle: boolean) {
  const idleRef = useRef(idle);
  idleRef.current = idle;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const current = currentEntryBundle(
      Array.from(document.scripts, script => script.src)
    );
    if (!current) return;

    const startedAt = Date.now();
    let latest: string | null = null;
    let reloading = false;
    let disposed = false;

    const check = async () => {
      try {
        const response = await fetch(`/kiosk?build=${Date.now()}`, {
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok) return;
        latest = extractEntryBundle(await response.text());
      } catch {
        // 끊겨 있으면 다음 확인 때 다시 시도한다.
      }
    };

    const maybeReload = () => {
      if (disposed || reloading) return;
      const reason = decideKioskReload({
        idle: idleRef.current,
        online: navigator.onLine !== false,
        currentBundle: current,
        latestBundle: latest,
        now: new Date(),
        startedAt,
      });
      if (!reason) return;
      reloading = true;
      window.location.reload();
    };

    void check();
    const checkTimer = window.setInterval(() => {
      void check().then(maybeReload);
    }, KIOSK_BUILD_CHECK_INTERVAL_MS);
    const tickTimer = window.setInterval(maybeReload, KIOSK_RELOAD_TICK_MS);

    return () => {
      disposed = true;
      window.clearInterval(checkTimer);
      window.clearInterval(tickTimer);
    };
  }, []);
}
