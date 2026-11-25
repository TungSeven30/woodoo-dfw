/**
 * Studio price estimate.
 *
 * No real prices are set yet (decision 2026-11-25: build the estimator, fill in real rates
 * later). Until every rate below is set, the studio shows sizes only, never a dollar figure.
 * Set the rates in the Vercel project's environment variables, in US dollars:
 *
 *   NEXT_PUBLIC_PRICE_BASE_PER_FT   base cabinets, per linear foot (includes fillers)
 *   NEXT_PUBLIC_PRICE_WALL_PER_FT   wall cabinets, per linear foot (stacked uppers included)
 *   NEXT_PUBLIC_PRICE_TALL_EACH     each tall pantry or linen tower
 *   NEXT_PUBLIC_PRICE_SPREAD        optional, ± share for the range shown (default 0.12)
 */

function rate(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const PRICING = {
  basePerFt: rate(process.env.NEXT_PUBLIC_PRICE_BASE_PER_FT),
  wallPerFt: rate(process.env.NEXT_PUBLIC_PRICE_WALL_PER_FT),
  tallEach: rate(process.env.NEXT_PUBLIC_PRICE_TALL_EACH),
  spread: rate(process.env.NEXT_PUBLIC_PRICE_SPREAD) ?? 0.12,
};

export function pricingReady(): boolean {
  return PRICING.basePerFt !== null && PRICING.wallPerFt !== null && PRICING.tallEach !== null;
}

export interface PriceEstimate {
  low: number;
  high: number;
}

/** Cabinet-only estimate from the planned runs, rounded to $50. Null until real rates are set. */
export function estimatePrice(totals: { baseRunIn: number; wallRunIn: number; tallCount: number }): PriceEstimate | null {
  if (!pricingReady()) return null;
  const mid =
    (totals.baseRunIn / 12) * (PRICING.basePerFt as number) +
    (totals.wallRunIn / 12) * (PRICING.wallPerFt as number) +
    totals.tallCount * (PRICING.tallEach as number);
  const r = (n: number) => Math.round(n / 50) * 50;
  return { low: r(mid * (1 - PRICING.spread)), high: r(mid * (1 + PRICING.spread)) };
}
