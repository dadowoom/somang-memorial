import fs from "fs";
import path from "path";
import {
  DEFAULT_KIOSK_DISPLAY_SETTINGS,
  normalizeKioskDisplaySettings,
  type KioskDisplayReport,
  type KioskDisplaySettings,
} from "../shared/kioskDisplay";
import { UPLOAD_DIR } from "./storage";

/**
 * 키오스크 세로 고정 설정과 화면 상태 보고를 두는 곳 (2026-10-03).
 *
 * 이 서비스에는 "설정" 표가 없다. 표를 새로 만들려면 DB 변경 승인이 필요하므로,
 * 설정 한 줄은 업로드 폴더 안의 숨김 폴더(.settings) 에 JSON 파일로 둔다.
 * 숨김 폴더는 /uploads 로 내보내지 않고(storageProxy 의 dotfiles: "deny"),
 * 업로드 정리 작업도 보지 않는다(uploadCleanup 이 점으로 시작하는 것을 건너뜀).
 * 업로드 폴더는 배포 사이에 그대로 남고 백업에도 들어간다.
 *
 * 파일을 쓸 수 없으면(권한 등) 서버 메모리에만 두고 관리자 화면에 알린다.
 * 화면 상태 보고는 처음부터 메모리에만 둔다(서버를 다시 켜면 비고, 키오스크가
 * 몇 분 안에 다시 알린다).
 */

export const KIOSK_DISPLAY_SETTINGS_FILE = path.join(
  UPLOAD_DIR,
  ".settings",
  "kiosk-display.json"
);

/** 보고는 기기(화면 크기 + 브라우저)마다 마지막 1건, 모두 합쳐 이만큼만 둔다. */
export const KIOSK_REPORT_MAX_DEVICES = 8;

const SETTINGS_CACHE_MS = 15 * 1000;

export type StoredKioskDisplaySettings = KioskDisplaySettings & {
  updatedAt: string | null;
};

export type StoredKioskDisplayReport = KioskDisplayReport & {
  receivedAt: string;
};

export function createKioskDisplayStore({
  filePath = KIOSK_DISPLAY_SETTINGS_FILE,
  now = () => new Date(),
  maxDevices = KIOSK_REPORT_MAX_DEVICES,
}: {
  filePath?: string;
  now?: () => Date;
  maxDevices?: number;
} = {}) {
  let cached: StoredKioskDisplaySettings | null = null;
  let cachedAt = 0;
  /** 마지막 저장이 파일까지 갔는지. false 면 서버를 다시 켜면 사라진다. */
  let persisted = true;
  const reports = new Map<string, StoredKioskDisplayReport>();

  function readFromDisk(): StoredKioskDisplaySettings {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return {
        ...normalizeKioskDisplaySettings(raw),
        updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.error("[KioskDisplay] 설정 파일을 읽지 못해 기본값을 씁니다.", code ?? error);
      }
      return { ...DEFAULT_KIOSK_DISPLAY_SETTINGS, updatedAt: null };
    }
  }

  function getSettings(): StoredKioskDisplaySettings {
    // 파일까지 저장되지 않은 값은 메모리 것이 최신이다. 그 밖에는 잠깐씩만
    // 기억했다가 다시 읽는다(서버가 여러 개 떠 있어도 서로 맞춰지게).
    const fresh = now().getTime() - cachedAt < SETTINGS_CACHE_MS;
    if (cached && (fresh || !persisted)) return cached;
    cached = readFromDisk();
    cachedAt = now().getTime();
    return cached;
  }

  function saveSettings(next: KioskDisplaySettings) {
    const value: StoredKioskDisplaySettings = {
      ...normalizeKioskDisplaySettings(next),
      updatedAt: now().toISOString(),
    };
    cached = value;
    cachedAt = now().getTime();
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      // 다 쓴 뒤 이름을 바꿔 끼운다. 쓰다 멈춰도 반쯤 쓴 파일이 남지 않는다.
      const temp = `${filePath}.${process.pid}.tmp`;
      fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
      fs.renameSync(temp, filePath);
      persisted = true;
    } catch (error) {
      persisted = false;
      console.error(
        "[KioskDisplay] 설정 파일을 쓰지 못했습니다. 서버 메모리에만 둡니다.",
        (error as NodeJS.ErrnoException)?.code ?? error
      );
    }
    return { settings: value, persisted };
  }

  function recordReport(report: KioskDisplayReport) {
    const key = `${report.screenWidth}x${report.screenHeight}@${report.pixelRatio}|${report.browser}`;
    reports.delete(key);
    reports.set(key, { ...report, receivedAt: now().toISOString() });
    while (reports.size > maxDevices) {
      const oldest = reports.keys().next().value;
      if (oldest === undefined) break;
      reports.delete(oldest);
    }
  }

  function listReports() {
    return Array.from(reports.values()).reverse();
  }

  return {
    getSettings,
    saveSettings,
    recordReport,
    listReports,
    isPersisted: () => persisted,
  };
}

export const kioskDisplayStore = createKioskDisplayStore();
