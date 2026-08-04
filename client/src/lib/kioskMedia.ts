export const KIOSK_VIDEO_LOAD_TIMEOUT_MS = 12_000;

export const KIOSK_VIDEO_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin" as const;

export type KioskVideoFrameState = {
  attempt: number;
  phase: "loading" | "responded" | "slow";
};

export type KioskVideoFrameEvent =
  | { type: "responded"; attempt: number }
  | { type: "timed-out"; attempt: number }
  | { type: "retry" };

export function createKioskVideoFrameState(): KioskVideoFrameState {
  return { attempt: 0, phase: "loading" };
}

export function reduceKioskVideoFrameState(
  state: KioskVideoFrameState,
  event: KioskVideoFrameEvent
): KioskVideoFrameState {
  if (event.type === "retry") {
    if (state.phase === "loading") return state;

    return {
      attempt: state.attempt + 1,
      phase: "loading",
    };
  }

  if (event.attempt !== state.attempt) return state;

  if (event.type === "responded") {
    return { ...state, phase: "responded" };
  }

  if (state.phase !== "loading") return state;

  return { ...state, phase: "slow" };
}
