import { ProductPhoto } from "./ProductPhoto";

interface Src {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * The hero kitchen, seen through a run of cabinet doors. One photo is cut into door-width
 * panels with a 2 px reveal between them, the same line the doors themselves have. Widths
 * follow a plausible elevation (narrow pull-out, wide pairs) rather than an even grid. The
 * panels hang into place on load; on desktop a panel lifts slightly under the pointer.
 * Every panel shows the same image URL, so the browser downloads and decodes it once.
 */
const DESKTOP: [number, number][] = [
  [0, 17],
  [17, 34],
  [34, 52],
  [52, 62],
  [62, 81],
  [81, 100],
];
const PHONE: [number, number][] = [
  [0, 31],
  [31, 57],
  [57, 76],
  [76, 100],
];

export function DoorHero({ photo, tall }: { photo: Src; tall: Src }) {
  return (
    <div className="dh" role="img" aria-label={photo.alt}>
      {DESKTOP.map(([x0, x1], i) => {
        const m = PHONE[i];
        const style = {
          "--x": x0,
          "--w": x1 - x0,
          "--xm": m ? m[0] : 0,
          "--wm": m ? m[1] - m[0] : 0,
          "--i": i,
        } as React.CSSProperties;
        return (
          <div key={i} className={`dh-door${m ? "" : " dh-wide-only"}`} style={style} aria-hidden="true">
            <div className="dh-plate">
              <ProductPhoto photo={{ ...photo, alt: "" }} tall={{ ...tall, alt: "" }} priority={i === 0} className="dh-img" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
