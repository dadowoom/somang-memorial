const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** 영상 창을 띄우는 곳. 재생 상태 메시지도 이 주소에서 온다. */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function isValidYouTubeVideoId(videoId: string) {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId.trim());
}

export function getYouTubeThumbnailUrl(videoId: string) {
  const normalizedVideoId = videoId.trim();
  if (!isValidYouTubeVideoId(normalizedVideoId)) return null;

  return `https://i.ytimg.com/vi/${normalizedVideoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(
  videoId: string,
  autoplay = false,
  options: {
    /** 주면 유튜브가 재생 상태를 이 화면에 알려 준다(youtubePlayerState.ts). */
    jsApiOrigin?: string;
  } = {}
) {
  const normalizedVideoId = videoId.trim();
  if (!isValidYouTubeVideoId(normalizedVideoId)) return null;

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    fs: "0",
    playsinline: "1",
  });

  if (autoplay) params.set("autoplay", "1");
  if (options.jsApiOrigin) {
    params.set("enablejsapi", "1");
    params.set("origin", options.jsApiOrigin);
  }

  return `${YOUTUBE_EMBED_ORIGIN}/embed/${normalizedVideoId}?${params.toString()}`;
}
