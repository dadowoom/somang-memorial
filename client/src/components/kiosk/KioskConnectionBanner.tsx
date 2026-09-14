import { trpc } from "@/lib/trpc";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 키오스크 인터넷이 끊겼을 때 위에 붙는 띠 (2026-09-14).
 *
 * 전에는 검색·편지 제출을 누르는 순간에만 연결을 확인해서, 회선이 끊겨도
 * 화면은 멀쩡해 보이다가 눌러야만 오류가 났다. 이제 끊기면 바로 띠가 뜨고,
 * 다시 이어지면 띠가 사라지면서 화면 자료를 자동으로 다시 불러온다.
 */
export function useKioskOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

export const KIOSK_OFFLINE_MESSAGE =
  "인터넷 연결이 끊겼습니다. 연결되면 자동으로 다시 불러옵니다.";

export default function KioskConnectionBanner() {
  const online = useKioskOnlineStatus();
  const utils = trpc.useUtils();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      return;
    }
    if (!wasOffline) return;
    setWasOffline(false);
    // 끊겼던 동안 실패한 조회를 전부 다시 시도한다.
    void utils.invalidate();
  }, [online, utils, wasOffline]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-[#9f2a2a] px-6 py-4 text-center text-lg font-medium text-white"
    >
      <WifiOff className="h-6 w-6 shrink-0" aria-hidden="true" />
      {KIOSK_OFFLINE_MESSAGE}
    </div>
  );
}
