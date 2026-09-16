import { describe, expect, it } from "vitest";
import {
  consumeKioskAttractOnArrival,
  KIOSK_ATTRACT_ON_ARRIVAL_KEY,
  requestKioskAttractOnArrival,
  KIOSK_ATTRACT_DEFAULT_SECONDS,
  clampPosterIndex,
  nextPosterIndex,
  posterDurationMs,
} from "./kioskAttract";

const poster = (displaySeconds: number) => ({
  id: 1,
  imageUrl: "/uploads/kiosk-posters/a.jpg",
  caption: null,
  displaySeconds,
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("추모관에서 3분 무입력으로 돌아올 때 광고부터", () => {
  it("표시해 두면 첫 화면이 한 번만 광고를 띄운다", () => {
    const storage = memoryStorage();
    expect(consumeKioskAttractOnArrival(storage)).toBe(false);
    requestKioskAttractOnArrival(storage);
    expect(storage.getItem(KIOSK_ATTRACT_ON_ARRIVAL_KEY)).toBe("1");
    expect(consumeKioskAttractOnArrival(storage)).toBe(true);
    expect(consumeKioskAttractOnArrival(storage)).toBe(false);
  });

  it("저장소를 쓸 수 없어도 멈추지 않는다", () => {
    expect(() => requestKioskAttractOnArrival(null)).not.toThrow();
    expect(consumeKioskAttractOnArrival(null)).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(() => requestKioskAttractOnArrival(broken)).not.toThrow();
    expect(consumeKioskAttractOnArrival(broken)).toBe(false);
  });
});

describe("posterDurationMs", () => {
  it("정한 초를 밀리초로 바꾼다", () => {
    expect(posterDurationMs(poster(8))).toBe(8000);
  });

  it("포스터가 없으면 기본 시간을 쓴다", () => {
    expect(posterDurationMs(undefined)).toBe(
      KIOSK_ATTRACT_DEFAULT_SECONDS * 1000
    );
  });

  it("너무 짧거나 긴 값은 사이 값으로 자른다", () => {
    expect(posterDurationMs(poster(0))).toBe(3000);
    expect(posterDurationMs(poster(-5))).toBe(3000);
    expect(posterDurationMs(poster(9999))).toBe(120000);
  });

  it("숫자가 아니면 기본 시간으로 돌아간다", () => {
    expect(posterDurationMs(poster(Number.NaN))).toBe(
      KIOSK_ATTRACT_DEFAULT_SECONDS * 1000
    );
  });
});

describe("nextPosterIndex", () => {
  it("마지막 장 다음은 첫 장이다", () => {
    expect(nextPosterIndex(0, 3)).toBe(1);
    expect(nextPosterIndex(2, 3)).toBe(0);
  });

  it("한 장뿐이면 늘 같은 장이다", () => {
    expect(nextPosterIndex(0, 1)).toBe(0);
  });

  it("포스터가 없으면 0 이다", () => {
    expect(nextPosterIndex(5, 0)).toBe(0);
  });
});

describe("clampPosterIndex", () => {
  it("목록이 줄어들면 마지막 장을 가리킨다", () => {
    expect(clampPosterIndex(7, 3)).toBe(2);
  });

  it("음수나 빈 목록은 0 이다", () => {
    expect(clampPosterIndex(-2, 3)).toBe(0);
    expect(clampPosterIndex(1, 0)).toBe(0);
  });
});
