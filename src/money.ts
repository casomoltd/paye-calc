/** Pence in a pound: every amount this library reports is to the penny. */
export const PENCE_PER_POUND = 100;

/** A percentage's denominator. */
const PER_CENT = 100;

/** An amount of pounds rounded to the nearest penny. */
export function roundPence(pounds: number): number {
  return Math.round(pounds * PENCE_PER_POUND) / PENCE_PER_POUND;
}

/**
 * The sum of amounts already in pence, rounded again so that float
 * addition cannot leave a stray fraction of a penny.
 */
export function sumPence(amounts: readonly number[]): number {
  return roundPence(amounts.reduce((sum, amount) => sum + amount, 0));
}

/** `percent` per cent of `amount`. */
export function percentOf(amount: number, percent: number): number {
  return (amount * percent) / PER_CENT;
}

/** A fraction written as a percentage: 0.2 is 20. */
export function asPercent(fraction: number): number {
  return fraction * PER_CENT;
}
