/**
 * 키오스크 세로 고정 (2026-10-03).
 *
 * 현장 키오스크는 모니터를 세로로 세워 둔다. 윈도우·모니터의 "화면 방향"
 * 설정이 풀리면 크롬이 가로(1920×1080)로 그려 글자가 옆으로 눕는다. 현장에
 * 가지 않고도 고칠 수 있게, 관리자 화면에서 켜면 키오스크가 스스로 화면 전체를
 * 90° 돌려 세로로 그린다.
 *
 * - 창이 이미 세로이면(기기 설정이 제대로면) 아무것도 하지 않는다. 이중 회전 금지.
 * - 시험·응급용으로 주소 끝에 ?rotate=cw|ccw|off 를 붙여 설정을 덮어쓸 수 있다.
 *   ?rotate=auto 는 덮어쓰기를 지운다.
 *
 * 화면과 서버가 함께 쓰는 순수 함수만 둔다.
 */

export const KIOSK_ROTATE_DIRECTIONS = ["ccw", "cw"] as const;
export type KioskRotateDirection = (typeof KIOSK_ROTATE_DIRECTIONS)[number];

export type KioskDisplaySettings = {
  /** 켜져 있고 창이 가로이면 화면을 돌린다. */
  portraitLock: boolean;
  /** ccw = 반시계 방향(-90°), cw = 시계 방향(+90°). */
  direction: KioskRotateDirection;
};

/** 처음 배포했을 때는 꺼져 있다. 관리자가 켜야 돌아간다. */
export const DEFAULT_KIOSK_DISPLAY_SETTINGS: KioskDisplaySettings = {
  portraitLock: false,
  direction: "ccw",
};

export type KioskRotateOverride = KioskRotateDirection | "off";

/** 주소 덮어쓰기 값. "auto" 는 덮어쓰기를 지우라는 뜻이다. */
export function parseKioskRotateParam(
  value: string | null | undefined
): KioskRotateOverride | "auto" | null {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "ccw" ||
    normalized === "cw" ||
    normalized === "off" ||
    normalized === "auto"
  ) {
    return normalized;
  }
  return null;
}

export function normalizeKioskDisplaySettings(
  value: unknown
): KioskDisplaySettings {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    portraitLock: source.portraitLock === true,
    direction: source.direction === "cw" ? "cw" : "ccw",
  };
}

export type KioskRotateReason =
  | "rotated"
  | "rotated-by-url"
  | "already-portrait"
  | "setting-off"
  | "off-by-url";

export const KIOSK_ROTATE_REASONS = [
  "rotated",
  "rotated-by-url",
  "already-portrait",
  "setting-off",
  "off-by-url",
] as const satisfies readonly KioskRotateReason[];

export type KioskRotateDecision = {
  rotation: KioskRotateDirection | null;
  reason: KioskRotateReason;
};

export function decideKioskRotation({
  settings,
  override,
  width,
  height,
}: {
  settings: KioskDisplaySettings | null;
  override: KioskRotateOverride | null;
  width: number;
  height: number;
}): KioskRotateDecision {
  if (override === "off") return { rotation: null, reason: "off-by-url" };
  // 창 크기만 본다. 화면 배율을 크게 잡은 키오스크(예: 200% → 960×540)도 돌린다.
  if (!(width > height)) return { rotation: null, reason: "already-portrait" };
  if (override) return { rotation: override, reason: "rotated-by-url" };
  if (!settings?.portraitLock) return { rotation: null, reason: "setting-off" };
  return { rotation: settings.direction, reason: "rotated" };
}

/**
 * 돌린 상자의 크기와 transform. 상자는 창의 왼쪽 위에 놓고 왼쪽 위를 축으로
 * 돌린 뒤 제자리로 밀어 넣는다. 상자 크기는 창의 가로·세로를 바꾼 것이다.
 *
 * ccw: 상자의 위쪽이 화면 왼쪽을 향한다 (내용이 시계 방향으로 누운 모니터를 바로잡는다).
 * cw : 상자의 위쪽이 화면 오른쪽을 향한다.
 */
export function kioskRotationFrameStyle(
  rotation: KioskRotateDirection,
  viewport: { width: number; height: number }
) {
  return {
    width: viewport.height,
    height: viewport.width,
    transform:
      rotation === "ccw"
        ? "rotate(-90deg) translateX(-100%)"
        : "rotate(90deg) translateY(-100%)",
    transformOrigin: "0 0",
  };
}

/**
 * 돌린 상자 안의 좌표(세로 화면 기준)를 실제 화면 좌표로 바꾼다. 시험과
 * 확인용이다. 상자 너비 = 창 높이.
 */
export function kioskFramePointToScreen(
  rotation: KioskRotateDirection,
  point: { x: number; y: number },
  viewport: { width: number; height: number }
) {
  return rotation === "ccw"
    ? { x: point.y, y: viewport.height - point.x }
    : { x: viewport.width - point.y, y: point.x };
}

// ---------------------------------------------------------------------------
// 화면 상태 보고. 개인정보 없이 화면 크기·방향·적용 여부·브라우저 종류만.

export const KIOSK_REPORT_UA_MAX = 40;

export type KioskDisplayReport = {
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  /** 화면 배율(devicePixelRatio). 소수 둘째 자리까지. */
  pixelRatio: number;
  rotation: KioskRotateDirection | null;
  reason: KioskRotateReason;
  /** 돌린 틀 안의 화면이 다 떴는지. 돌리지 않을 때는 null. */
  frameReady: boolean | null;
  browser: string;
};

/** 브라우저 문자열을 "Chrome 141 · Windows" 정도로 줄인다. */
export function summarizeUserAgent(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const pick = (pattern: RegExp) => ua.match(pattern)?.[1];
  const edge = pick(/Edg\/(\d+)/);
  const samsung = pick(/SamsungBrowser\/(\d+)/);
  const chrome = pick(/(?:Chrome|CriOS)\/(\d+)/);
  const firefox = pick(/(?:Firefox|FxiOS)\/(\d+)/);
  const safari = /Safari\//.test(ua) ? pick(/Version\/(\d+)/) : undefined;
  const name = edge
    ? `Edge ${edge}`
    : samsung
      ? `Samsung ${samsung}`
      : chrome
        ? `Chrome ${chrome}`
        : firefox
          ? `Firefox ${firefox}`
          : safari
            ? `Safari ${safari}`
            : "기타 브라우저";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return (os ? `${name} · ${os}` : name).slice(0, KIOSK_REPORT_UA_MAX);
}

export function kioskOrientationLabel(width: number, height: number) {
  return width > height ? "가로" : width < height ? "세로" : "정사각";
}

const REASON_LABELS: Record<KioskRotateReason, string> = {
  rotated: "세로 고정 적용 중",
  "rotated-by-url": "세로 고정 적용 중 (주소로 켬)",
  "already-portrait": "돌리지 않음 (이미 세로)",
  "setting-off": "돌리지 않음 (설정 꺼짐)",
  "off-by-url": "돌리지 않음 (주소로 끔)",
};

export function kioskRotateReasonLabel(reason: KioskRotateReason) {
  return REASON_LABELS[reason];
}

export function kioskDirectionLabel(direction: KioskRotateDirection) {
  return direction === "ccw" ? "반시계 방향" : "시계 방향";
}
