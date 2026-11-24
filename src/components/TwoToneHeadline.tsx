import React from "react";

/**
 * Splits "First sentence. Rest of it." so the second half sits one tone back.
 * Single-sentence headlines render unchanged.
 */
export function TwoToneHeadline({ text }: { text: string }) {
  const m = text.match(/^(.+?[.?])\s+(.+)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]} <span className="tone-2">{m[2]}</span>
    </>
  );
}
