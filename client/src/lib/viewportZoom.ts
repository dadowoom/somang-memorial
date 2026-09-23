/**
 * 휴대폰 두 손가락 확대 (2026-09-23).
 *
 * 전에는 index.html 의 화면 설정에 maximum-scale=1 이 있어서, 안드로이드 폰에서는
 * 두 손가락으로 화면을 키울 수 없었다. 글씨가 작아도 어르신이 키워 볼 수 없었다.
 * 이제 기본은 확대를 허락한다.
 *
 * 아이폰·아이패드만 maximum-scale=1 을 다시 붙인다. 아이폰은 이 값이 있어도 두 손가락
 * 확대는 그대로 되고, 대신 글씨가 작은 입력칸을 누를 때 화면이 저절로 확대되는 것만
 * 막아 준다.
 *
 * 키오스크 확대는 이것과 따로 막는다 (hooks/useKioskDocumentMode.ts, index.css).
 */
export const VIEWPORT_BASE = "width=device-width, initial-scale=1.0";
export const VIEWPORT_IOS = `${VIEWPORT_BASE}, maximum-scale=1`;

export function isAppleTouchDevice(
  userAgent: string,
  maxTouchPoints: number
): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  // 요즘 아이패드는 맥처럼 자신을 알린다. 터치가 되면 아이패드로 본다.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function viewportContentFor(
  userAgent: string,
  maxTouchPoints: number
): string {
  return isAppleTouchDevice(userAgent, maxTouchPoints)
    ? VIEWPORT_IOS
    : VIEWPORT_BASE;
}

export function applyViewportZoomPolicy() {
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return;
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  meta.content = viewportContentFor(
    navigator.userAgent,
    navigator.maxTouchPoints ?? 0
  );
}
