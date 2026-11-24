import Image from "next/image";
import { IMAGES, type ImageKey } from "@/config/images";

type Shape = "wide" | "land" | "port";

/** A product image with a rounded frame and, for renders, a small "Concept render" tag. */
export function Media({
  name,
  shape = "land",
  priority = false,
  sizes = "(max-width: 900px) 100vw, 60vw",
  className = "",
}: {
  name: ImageKey;
  shape?: Shape;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const img = IMAGES[name];
  return (
    <figure className={`media media-${shape} ${className}`.trim()}>
      <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} />
      {img.concept ? <figcaption className="media-tag">Concept render</figcaption> : null}
    </figure>
  );
}
