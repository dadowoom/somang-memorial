/**
 * 유튜브 영상이 지금 재생 중인지 알아낸다 (2026-09-16 현장 요청:
 * "영상을 볼 땐 터치를 안 하고 있어도 첫 화면으로 넘어가면 안 된다").
 *
 * 영상 안을 누르는 손가락은 키오스크 화면의 터치로 잡히지 않는다. 그래서
 * 유튜브 창 주소에 enablejsapi=1 을 붙이고 "상태를 알려 달라(listening)"는
 * 메시지를 보내면, 유튜브가 재생 상태가 바뀔 때마다 알려 주는 것을 쓴다.
 * 맥 브라우저에서 확인: 재생을 누르면 -1 → 3 → 1 이 오고, 재생 중에는
 * 0.25초마다 재생 위치(currentTime)가 온다.
 */

/** 유튜브가 알려 주는 재생 상태 번호. */
export const YOUTUBE_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

/** 유튜브 창이 준비되기 전이면 이만큼 기다렸다가 다시 부탁한다. */
export const YOUTUBE_LISTEN_RETRY_MS = 500;
/** 다시 부탁하는 최대 횟수. 그래도 답이 없으면 "모름"으로 둔다. */
export const YOUTUBE_LISTEN_MAX_TRIES = 20;

/** 유튜브 창에서 온 메시지에서 재생 상태 번호를 꺼낸다. 상태가 없으면 null. */
export function readYouTubePlayerState(data: unknown): number | null {
  let message: unknown = data;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      return null;
    }
  }
  if (!message || typeof message !== "object") return null;

  const { event, info } = message as { event?: unknown; info?: unknown };
  if (event === "onStateChange" && typeof info === "number") return info;
  if (
    (event === "infoDelivery" || event === "initialDelivery") &&
    info &&
    typeof info === "object"
  ) {
    const state = (info as { playerState?: unknown }).playerState;
    if (typeof state === "number") return state;
  }
  return null;
}

/** 재생 중이거나 이어 보려고 불러오는 중이면 "보는 중"이다. */
export function isYouTubeWatching(state: number | null) {
  return (
    state === YOUTUBE_PLAYER_STATE.PLAYING ||
    state === YOUTUBE_PLAYER_STATE.BUFFERING
  );
}

/** 유튜브 창에 보낼 "상태를 알려 달라" 메시지. */
export function youTubeListeningMessages(id = 1) {
  return [
    JSON.stringify({ event: "listening", id, channel: "widget" }),
    JSON.stringify({
      event: "command",
      func: "addEventListener",
      args: ["onStateChange"],
      id,
      channel: "widget",
    }),
  ];
}
