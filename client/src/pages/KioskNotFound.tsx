import { useKioskIdleReset } from "@/hooks/useKioskIdleReset";
import { House } from "lucide-react";
import { useCallback } from "react";
import { useLocation } from "wouter";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

/** 잘못된 키오스크 주소는 이 시간 뒤 저절로 검색 화면으로 돌아간다. */
export const KIOSK_NOT_FOUND_RETURN_MS = 15_000;

/**
 * `/kiosk/...` 아래의 없는 주소로 왔을 때 보는 화면 (2026-09-14).
 *
 * 전에는 일반 홈페이지의 "페이지를 찾지 못했습니다"가 떴다. 그 화면에는 메뉴와
 * 로그인 링크가 있어 관람객이 공용 단말에서 홈페이지로 빠져나갈 수 있었고,
 * 자동 초기화도 없어 그대로 멈춰 있었다. 여기서는 처음으로 가는 길만 두고,
 * 아무도 안 만지면 15초 뒤 스스로 돌아간다.
 */
export default function KioskNotFound() {
  const [, setLocation] = useLocation();
  const returnToKiosk = useCallback(() => {
    setLocation("/kiosk", { replace: true });
  }, [setLocation]);

  useKioskIdleReset(returnToKiosk, KIOSK_NOT_FOUND_RETURN_MS);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-white px-8 text-[#121212]">
      <div className="w-full max-w-[640px] text-center">
        <p className="text-sm font-medium tracking-[0.24em] text-[#777]">
          SOMANG MEMORIAL
        </p>
        <h1 className="mt-6 text-[40px] leading-tight" style={serifStyle}>
          화면을 찾지 못했습니다
        </h1>
        <p className="mt-6 text-lg leading-8 text-[#64615d]">
          잠시 뒤 처음 화면으로 돌아갑니다.
        </p>
        <button
          type="button"
          onClick={returnToKiosk}
          className="mt-10 inline-flex h-16 items-center gap-3 border border-[#18181b] bg-[#18181b] px-8 text-xl font-medium text-white"
        >
          <House className="h-6 w-6" aria-hidden="true" />
          처음으로
        </button>
      </div>
    </main>
  );
}
