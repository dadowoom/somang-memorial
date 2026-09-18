import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { toImgUrl, toThumbnailUrl } from "@/lib/imageUrl";

/**
 * 사진첩처럼 작게 보여 주는 곳의 사진 (2026-09-19). 작은 사진을 먼저 부르고,
 * 없으면(옛 사진) 원본으로 돌아간다. 화면 밖 사진은 가까이 올 때 부른다.
 */
export default function ThumbImage({
  src,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
}) {
  const thumb = toThumbnailUrl(src);
  const original = toImgUrl(src);
  const [current, setCurrent] = useState(thumb);

  useEffect(() => {
    setCurrent(thumb);
  }, [thumb]);

  return (
    <img
      loading="lazy"
      decoding="async"
      {...rest}
      src={current}
      onError={event => {
        if (current !== original) setCurrent(original);
        rest.onError?.(event);
      }}
    />
  );
}
