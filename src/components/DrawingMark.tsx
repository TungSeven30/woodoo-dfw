/**
 * A section mark in the style of a cabinet shop drawing: a sheet number, a short rule and a
 * title. It gives the long home page a reading order without headers in caps.
 */
export function DrawingMark({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="dw-mark">
      <span className="dw-n">{n}</span>
      <span className="dw-rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
