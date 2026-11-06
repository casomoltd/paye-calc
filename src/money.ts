/** Pence in a pound: every amount this library reports is to the penny. */
export const PENCE_PER_POUND = 100;

/** A percentage's denominator. */
const PER_CENT = 100;

/** An amount of pounds rounded to the nearest penny. */
export function roundPence(pounds: number): number {
  return Math.round(pounds * PENCE_PER_POUND) / PENCE_PER_POUND;
}

/**
 * Refuse an amount of money that is negative or not a finite number, with
 * a RangeError naming `what` it was: no pay or benefit is below nil, and a
 * figure worked on one would be a wrong answer rather than an error.
 */
export function assertPayAmount(pounds: number, what: string): void {
  if (!Number.isFinite(pounds) || pounds < 0) {
    throw new RangeError(`${what} ${pounds} is not a non-negative number`);
  }
}

/**
 * What a rate charges on an amount, to the penny. Every row of a
 * breakdown, tax, NI or loan, is priced here, so a row and its total
 * cannot round differently.
 */
export function charge(amount: number, rate: number): number {
  return roundPence(amount * rate);
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

/** `amount` raised by `rate`, a decimal: 0.03 raises 100 to 103. */
export function uplift(amount: number, rate: number): number {
  return amount * (1 + rate);
}

/** A fraction written as a percentage: 0.2 is 20. */
export function asPercent(fraction: number): number {
  return fraction * PER_CENT;
}
