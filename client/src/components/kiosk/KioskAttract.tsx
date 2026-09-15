import { useEffect, useState } from "react";
import type { KioskPoster } from "@/lib/kioskAttract";
import {
  clampPosterIndex,
  nextPosterIndex,
  posterDurationMs,
} from "@/lib/kioskAttract";
import "./kioskAttract.css";

/**
 * 아무도 만지지 않을 때 키오스크에 뜨는 광고 화면. 관리자가 올린 포스터를
 * 화면 가득 채워 차례로 보여 주고, 어디를 눌러도 검색 화면으로 넘어간다.
 */
export default function KioskAttract({
  posters,
  onActivate,
}: {
  posters: KioskPoster[];
  onActivate: () => void;
}) {
  const [index, setIndex] = useState(0);
  const count = posters.length;
  const activeIndex = clampPosterIndex(index, count);

  useEffect(() => {
    // 관리자가 한 장을 지우면 없는 장을 가리킬 수 있다.
    setIndex(current => clampPosterIndex(current, count));
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setTimeout(() => {
      setIndex(current => nextPosterIndex(current, count));
    }, posterDurationMs(posters[activeIndex]));

    return () => window.clearTimeout(timer);
  }, [activeIndex, count, posters]);

  if (count === 0) return null;

  const active = posters[activeIndex];

  return (
    <div
      className="kiosk-attract"
      role="button"
      tabIndex={0}
      aria-label="화면을 터치하면 그리운 분을 찾을 수 있습니다"
      onPointerDown={onActivate}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      {posters.map((poster, position) => (
        <div
          key={poster.id}
          className={
            position === activeIndex
              ? "kiosk-attract-slide is-active"
              : "kiosk-attract-slide"
          }
          style={{ backgroundImage: `url("${poster.imageUrl}")` }}
          aria-hidden="true"
        />
      ))}

      <div className="kiosk-attract-hint">
        <span className="kiosk-attract-touch" aria-hidden="true" />
        <p className="kiosk-attract-title">화면을 터치해 주세요</p>
        {active?.caption ? (
          <p className="kiosk-attract-caption">{active.caption}</p>
        ) : null}
        {count > 1 && (
          <div className="kiosk-attract-dots" aria-hidden="true">
            {posters.map((poster, position) => (
              <span
                key={poster.id}
                className={position === activeIndex ? "is-active" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
