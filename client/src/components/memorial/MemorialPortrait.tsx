import { toImgUrl } from "@/lib/imageUrl";
import { formatLifespan } from "@/lib/lifespan";

export default function MemorialPortrait({
  name,
  birthDate,
  deathDate,
  photo,
}: {
  name: string;
  birthDate: string;
  deathDate: string;
  photo?: string | null;
}) {
  return (
    <figure className="memorial-portrait">
      {photo ? (
        <img
          src={toImgUrl(photo)}
          alt={`${name} 사진`}
          className="memorial-portrait__image"
          style={{ filter: "grayscale(1) contrast(1.04) brightness(1.02)" }}
        />
      ) : (
        <div className="memorial-portrait__empty" aria-label={`${name} 추모관`}>
          {Array.from(name.trim())[0] || "소망"}
        </div>
      )}
      <figcaption>
        <span>소망 안에 간직하는 기억</span>
        <span>{formatLifespan(birthDate, deathDate)}</span>
      </figcaption>
    </figure>
  );
}
