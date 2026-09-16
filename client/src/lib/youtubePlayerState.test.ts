import { describe, expect, it } from "vitest";
import {
  isYouTubeWatching,
  readYouTubePlayerState,
  YOUTUBE_PLAYER_STATE,
  youTubeListeningMessages,
} from "./youtubePlayerState";

describe("readYouTubePlayerState", () => {
  it("상태가 바뀌었다는 메시지에서 상태 번호를 꺼낸다", () => {
    expect(
      readYouTubePlayerState('{"event":"onStateChange","info":1,"id":1}')
    ).toBe(1);
  });

  it("정보 전달 메시지 안의 playerState 를 꺼낸다", () => {
    expect(
      readYouTubePlayerState(
        '{"event":"infoDelivery","info":{"playerState":2,"currentTime":5.2}}'
      )
    ).toBe(2);
    expect(
      readYouTubePlayerState({
        event: "initialDelivery",
        info: { playerState: -1 },
      })
    ).toBe(-1);
  });

  it("상태가 없거나 알 수 없는 메시지는 null", () => {
    expect(
      readYouTubePlayerState(
        '{"event":"infoDelivery","info":{"currentTime":3}}'
      )
    ).toBeNull();
    expect(readYouTubePlayerState('{"event":"onReady"}')).toBeNull();
    expect(readYouTubePlayerState("유튜브가 아닌 글")).toBeNull();
    expect(readYouTubePlayerState(null)).toBeNull();
    expect(readYouTubePlayerState(42)).toBeNull();
  });
});

describe("isYouTubeWatching", () => {
  it("재생 중이거나 불러오는 중이면 보는 중이다", () => {
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.PLAYING)).toBe(true);
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.BUFFERING)).toBe(true);
  });

  it("멈춤·끝남·시작 전·모름은 보는 중이 아니다", () => {
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.PAUSED)).toBe(false);
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.ENDED)).toBe(false);
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.UNSTARTED)).toBe(false);
    expect(isYouTubeWatching(YOUTUBE_PLAYER_STATE.CUED)).toBe(false);
    expect(isYouTubeWatching(null)).toBe(false);
  });
});

describe("youTubeListeningMessages", () => {
  it("상태를 알려 달라는 부탁과 상태 변화 듣기 명령을 보낸다", () => {
    const [listening, command] = youTubeListeningMessages(7).map(message =>
      JSON.parse(message)
    );
    expect(listening).toEqual({ event: "listening", id: 7, channel: "widget" });
    expect(command).toMatchObject({
      event: "command",
      func: "addEventListener",
      args: ["onStateChange"],
    });
  });
});
