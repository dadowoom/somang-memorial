import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 자동 재생 시도 (사용자 상호작용 필요)
    const playAudio = async () => {
      try {
        if (!isMuted) {
          audio.volume = 0.3; // 30% 볼륨
          await audio.play();
        }
      } catch (error) {
        console.log("Auto-play prevented:", error);
      }
    };

    // 사용자 상호작용 후 재생 시작
    const handleUserInteraction = () => {
      playAudio();
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    if (!isMuted) {
      document.addEventListener("click", handleUserInteraction);
      document.addEventListener("touchstart", handleUserInteraction);
    }

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {
          console.log("Play failed");
        });
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/memorial-bgm_b67e47cf.mp3"
        loop
        crossOrigin="anonymous"
      />
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
        title={isMuted ? "음악 켜기" : "음악 끄기"}
        aria-label="음악 토글"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </>
  );
}
