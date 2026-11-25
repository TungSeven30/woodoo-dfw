import { getImageProps } from "next/image";

interface Src {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * A photo served at full sharpness: Next.js builds AVIF and WebP versions at every width up
 * to 3840 px, so a 3x phone and a 2x desktop both get real pixels. Pass `tall` to swap in a
 * portrait crop on narrow screens.
 */
export function ProductPhoto({
  photo,
  tall,
  sizes = "100vw",
  priority = false,
  className = "",
}: {
  photo: Src;
  tall?: Src;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const common = { alt: photo.alt, sizes, quality: 90, priority } as const;
  const { props: wide } = getImageProps({ ...common, src: photo.src, width: photo.width, height: photo.height });
  if (!tall) {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...wide} className={className} />;
  }
  const { props: narrow } = getImageProps({ ...common, src: tall.src, width: tall.width, height: tall.height });
  return (
    <picture className={className}>
      <source media="(max-width: 760px)" srcSet={narrow.srcSet} sizes={sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img {...wide} />
    </picture>
  );
}
