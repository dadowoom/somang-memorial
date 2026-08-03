const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidYouTubeVideoId(videoId: string) {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId.trim());
}

export function getYouTubeThumbnailUrl(videoId: string) {
  const normalizedVideoId = videoId.trim();
  if (!isValidYouTubeVideoId(normalizedVideoId)) return null;

  return `https://i.ytimg.com/vi/${normalizedVideoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = false) {
  const normalizedVideoId = videoId.trim();
  if (!isValidYouTubeVideoId(normalizedVideoId)) return null;

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    fs: "0",
    playsinline: "1",
  });

  if (autoplay) params.set("autoplay", "1");

  return `https://www.youtube-nocookie.com/embed/${normalizedVideoId}?${params.toString()}`;
}
