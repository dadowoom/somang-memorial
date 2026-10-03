import { describe, expect, it, vi } from "vitest";
import {
  isKioskRotationFrame,
  kioskFrameSource,
  readCachedKioskDisplaySettings,
  readKioskRotateOverride,
  reloadKioskDocument,
  writeCachedKioskDisplaySettings,
} from "./kioskFrame";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("readKioskRotateOverride", () => {
  it("주소의 rotate 값을 읽고 이 탭에 기억한다", () => {
    const storage = memoryStorage();
    expect(readKioskRotateOverride("?rotate=cw", storage)).toBe("cw");
    // 화면을 옮겨 주소에서 사라져도 기억한 값을 쓴다.
    expect(readKioskRotateOverride("", storage)).toBe("cw");
    expect(readKioskRotateOverride("?rotate=off", storage)).toBe("off");
    expect(readKioskRotateOverride("?x=1", storage)).toBe("off");
  });

  it("?rotate=auto 는 덮어쓰기를 지우고, 이상한 값은 무시한다", () => {
    const storage = memoryStorage();
    readKioskRotateOverride("?rotate=ccw", storage);
    expect(readKioskRotateOverride("?rotate=auto", storage)).toBeNull();
    expect(readKioskRotateOverride("", storage)).toBeNull();
    expect(readKioskRotateOverride("?rotate=sideways", storage)).toBeNull();
  });

  it("저장소를 못 써도 주소 값은 듣는다", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readKioskRotateOverride("?rotate=ccw", broken)).toBe("ccw");
    expect(readKioskRotateOverride("", broken)).toBeNull();
    expect(readKioskRotateOverride("", null)).toBeNull();
  });
});

describe("kioskFrameSource", () => {
  it("틀에 담을 주소에서 rotate 만 뺀다", () => {
    expect(
      kioskFrameSource({ pathname: "/kiosk", search: "?rotate=ccw", hash: "" })
    ).toBe("/kiosk");
    expect(
      kioskFrameSource({
        pathname: "/kiosk/memorial/kim",
        search: "?tab=letters&rotate=off",
        hash: "#gallery",
      })
    ).toBe("/kiosk/memorial/kim?tab=letters#gallery");
  });
});

describe("isKioskRotationFrame / reloadKioskDocument", () => {
  const location = (origin: string) => ({ origin, reload: vi.fn() });

  it("같은 사이트가 감싼 틀 안일 때만 참이다", () => {
    const top = { location: location("https://somangmemorial.co.kr") };
    const framed = {
      location: location("https://somangmemorial.co.kr"),
      top,
    } as unknown as Window & { self: unknown };
    (framed as { self: unknown }).self = framed;
    expect(isKioskRotationFrame(framed)).toBe(true);

    const alone = { location: location("https://somangmemorial.co.kr") } as {
      location: ReturnType<typeof location>;
      self?: unknown;
      top?: unknown;
    };
    alone.self = alone;
    alone.top = alone;
    expect(isKioskRotationFrame(alone as unknown as Window)).toBe(false);

    const foreignTop = {
      get location(): never {
        throw new Error("cross-origin");
      },
    };
    const foreign = {
      location: location("https://somangmemorial.co.kr"),
      top: foreignTop,
    } as { self?: unknown };
    foreign.self = foreign;
    expect(isKioskRotationFrame(foreign as unknown as Window)).toBe(false);
  });

  it("틀 안에서 새로고침하면 바깥 창을 새로고침한다", () => {
    const top = { location: location("https://somangmemorial.co.kr") };
    const framed = {
      location: location("https://somangmemorial.co.kr"),
      top,
    } as { self?: unknown; location: ReturnType<typeof location> };
    framed.self = framed;
    reloadKioskDocument(framed as unknown as Window);
    expect(top.location.reload).toHaveBeenCalledTimes(1);
    expect(framed.location.reload).not.toHaveBeenCalled();

    const alone = {
      location: location("https://somangmemorial.co.kr"),
    } as { self?: unknown; top?: unknown; location: ReturnType<typeof location> };
    alone.self = alone;
    alone.top = alone;
    reloadKioskDocument(alone as unknown as Window);
    expect(alone.location.reload).toHaveBeenCalledTimes(1);
  });
});

describe("마지막 설정 기억", () => {
  it("쓰고 읽고, 깨진 값은 없는 것으로 본다", () => {
    const storage = memoryStorage();
    expect(readCachedKioskDisplaySettings(storage)).toBeNull();
    writeCachedKioskDisplaySettings({ portraitLock: true, direction: "cw" }, storage);
    expect(readCachedKioskDisplaySettings(storage)).toEqual({
      portraitLock: true,
      direction: "cw",
    });
    storage.setItem("somang:kiosk-display", "{broken");
    expect(readCachedKioskDisplaySettings(storage)).toBeNull();
  });
});
