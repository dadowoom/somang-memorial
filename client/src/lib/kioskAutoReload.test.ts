import { describe, expect, it } from "vitest";
import {
  KIOSK_NIGHTLY_MIN_UPTIME_MS,
  currentEntryBundle,
  decideKioskReload,
  extractEntryBundle,
} from "./kioskAutoReload";

const html = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-CLcLMGUe.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-ClAWCoPZ.css">
</head><body></body></html>`;

describe("extractEntryBundle", () => {
  it("index.html 에서 화면 묶음 파일 이름을 찾는다", () => {
    expect(extractEntryBundle(html)).toBe("index-CLcLMGUe.js");
  });

  it("묶음 파일이 없으면 null", () => {
    expect(extractEntryBundle("<html></html>")).toBeNull();
  });
});

describe("currentEntryBundle", () => {
  it("스크립트 주소 목록에서 묶음 파일 이름을 찾는다", () => {
    expect(
      currentEntryBundle([
        "https://somangmemorial.co.kr/assets/react-vendor-CfWXiJ_q.js",
        "https://somangmemorial.co.kr/assets/index-xyPtPTyC.js",
      ])
    ).toBe("index-xyPtPTyC.js");
  });

  it("개발 서버처럼 해시 파일이 없으면 null", () => {
    expect(
      currentEntryBundle(["http://127.0.0.1:5199/src/main.tsx"])
    ).toBeNull();
  });
});

describe("decideKioskReload", () => {
  const noon = new Date("2026-09-16T12:00:00+09:00");
  const base = {
    idle: true,
    online: true,
    currentBundle: "index-old.js",
    latestBundle: "index-old.js",
    now: noon,
    startedAt: noon.getTime() - 60 * 1000,
  };

  it("묶음 파일이 달라지면 새 배포로 보고 새로고침한다", () => {
    expect(decideKioskReload({ ...base, latestBundle: "index-new.js" })).toBe(
      "new-build"
    );
  });

  it("손님이 쓰는 중이면 새 배포가 있어도 기다린다", () => {
    expect(
      decideKioskReload({ ...base, latestBundle: "index-new.js", idle: false })
    ).toBeNull();
  });

  it("인터넷이 끊겨 있으면 절대 새로고침하지 않는다", () => {
    expect(
      decideKioskReload({
        ...base,
        latestBundle: "index-new.js",
        online: false,
      })
    ).toBeNull();
  });

  it("아직 서버 쪽 이름을 못 읽었으면 그대로 둔다", () => {
    expect(decideKioskReload({ ...base, latestBundle: null })).toBeNull();
    expect(decideKioskReload({ ...base, currentBundle: null })).toBeNull();
  });

  it("새벽 4시대에 12시간 이상 켜져 있었으면 한 번 새로고침한다", () => {
    const dawn = new Date("2026-09-16T04:10:00+09:00");
    expect(
      decideKioskReload({
        ...base,
        now: dawn,
        startedAt: dawn.getTime() - KIOSK_NIGHTLY_MIN_UPTIME_MS,
      })
    ).toBe("nightly");
  });

  it("새벽에 방금 새로고침한 뒤에는 또 하지 않는다", () => {
    const dawn = new Date("2026-09-16T04:20:00+09:00");
    expect(
      decideKioskReload({
        ...base,
        now: dawn,
        startedAt: dawn.getTime() - 5 * 60 * 1000,
      })
    ).toBeNull();
  });

  it("낮에는 오래 켜져 있어도 새벽 새로고침을 하지 않는다", () => {
    expect(
      decideKioskReload({
        ...base,
        startedAt: noon.getTime() - 2 * KIOSK_NIGHTLY_MIN_UPTIME_MS,
      })
    ).toBeNull();
  });
});
