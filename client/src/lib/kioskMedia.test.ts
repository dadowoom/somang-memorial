import { describe, expect, it } from "vitest";
import {
  createKioskVideoFrameState,
  KIOSK_VIDEO_IFRAME_SANDBOX,
  KIOSK_VIDEO_LOAD_TIMEOUT_MS,
  reduceKioskVideoFrameState,
} from "./kioskMedia";

describe("kiosk video frame state", () => {
  it("starts in a loading state with a bounded timeout", () => {
    expect(createKioskVideoFrameState()).toEqual({
      attempt: 0,
      phase: "loading",
    });
    expect(KIOSK_VIDEO_LOAD_TIMEOUT_MS).toBe(12_000);
  });

  it("marks only the current attempt as responded", () => {
    const state = { attempt: 1, phase: "loading" } as const;

    expect(
      reduceKioskVideoFrameState(state, { type: "responded", attempt: 0 })
    ).toBe(state);
    expect(
      reduceKioskVideoFrameState(state, { type: "responded", attempt: 1 })
    ).toEqual({ attempt: 1, phase: "responded" });
  });

  it("shows a slow connection only for the current loading attempt", () => {
    const state = createKioskVideoFrameState();
    const responded = reduceKioskVideoFrameState(state, {
      type: "responded",
      attempt: 0,
    });

    expect(
      reduceKioskVideoFrameState(state, { type: "timed-out", attempt: 0 })
    ).toEqual({ attempt: 0, phase: "slow" });
    expect(
      reduceKioskVideoFrameState(responded, {
        type: "timed-out",
        attempt: 0,
      })
    ).toBe(responded);
  });

  it("retries once and ignores a late response from the previous attempt", () => {
    const slow = { attempt: 0, phase: "slow" } as const;
    const retrying = reduceKioskVideoFrameState(slow, { type: "retry" });

    expect(retrying).toEqual({ attempt: 1, phase: "loading" });
    expect(
      reduceKioskVideoFrameState(retrying, {
        type: "responded",
        attempt: 0,
      })
    ).toBe(retrying);
    expect(
      reduceKioskVideoFrameState(retrying, {
        type: "timed-out",
        attempt: 0,
      })
    ).toBe(retrying);
    expect(reduceKioskVideoFrameState(retrying, { type: "retry" })).toBe(
      retrying
    );
  });
});

describe("kiosk video iframe sandbox", () => {
  it("keeps playback permissions but blocks kiosk escape permissions", () => {
    const tokens = new Set(KIOSK_VIDEO_IFRAME_SANDBOX.split(" "));

    expect(tokens).toEqual(new Set(["allow-scripts", "allow-same-origin"]));
    expect(tokens.has("allow-popups")).toBe(false);
    expect(tokens.has("allow-popups-to-escape-sandbox")).toBe(false);
    expect(tokens.has("allow-top-navigation")).toBe(false);
    expect(tokens.has("allow-top-navigation-by-user-activation")).toBe(false);
    expect(tokens.has("allow-downloads")).toBe(false);
    expect(tokens.has("allow-presentation")).toBe(false);
  });
});
