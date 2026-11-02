/**
 * The gross pension income that leaves a target after income tax.
 *
 * This is not `TakeHomePay`'s inverse. That one inverts the whole of an
 * earner's take-home pay — pension contributions, National Insurance,
 * student loan — which is the right question for a salary and the wrong
 * one for a pension in payment, where income tax is the only deduction.
 */
import type {TaxRegion, TaxYear} from './types.js';
import {getTaxYearConfig} from './taxYears/index.js';
import {calculateTaperedPersonalAllowance} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import {incomeTaxRows, taxOf} from './incomeTax.js';
import {freePayOfAllowance} from './freePay.js';
import {PENCE_PER_POUND, roundPence} from './money.js';

/** A step two pounds past the taper's start: the taper takes whole pounds,
 *  £1 for each £2, so this is the shortest step that shows its rate. */
const TAPER_PROBE = 2;

/** How fast the search's upper bound grows until it covers the target. */
const WIDEN_BY = 2;

/** Income tax on a gross income with nothing else deducted, as this
 *  library charges it: PAYE free pay with no code given, the region's
 *  bands, rounded to the penny. */
function incomeTaxOn(gross: number, config: TaxYearConfig): number {
  return taxOf(incomeTaxRows(gross, config, null));
}

/**
 * The gross incomes at which the marginal rate changes: free pay, each
 * band edge, and the two ends of the allowance taper. Between two of
 * them income tax is linear in gross, which is what makes the inverse a
 * straight line on each piece. Free pay is the allowance plus £9, and
 * the taper runs until that is gone.
 */
function breakpoints(config: TaxYearConfig): number[] {
  const allowance = config.personalAllowance;
  const taperFrom = config.personalAllowanceTaperStart;
  // The allowance lost per pound of income inside the taper, read off
  // the library's own taper rather than restated here.
  const perPound = (allowance
    - calculateTaperedPersonalAllowance(taperFrom + TAPER_PROBE, config))
    / TAPER_PROBE;
  const free = freePayOfAllowance(allowance);
  const taperTo = taperFrom + free / perPound;
  const edges = config.incomeTaxBands
    .flatMap((b) => [b.min, b.max])
    .filter(Number.isFinite);
  const points = [0, free, taperFrom, taperTo];
  for (const edge of edges) {
    // Where taxable income reaches `edge`: gross less free pay below the
    // taper, less a shrinking free pay inside it, and gross itself once
    // free pay is gone.
    points.push(edge + free);
    points.push(
      (edge + free + perPound * taperFrom) / (1 + perPound),
    );
    points.push(edge);
  }
  return [...new Set(points)]
    .filter((p) => p >= 0)
    .sort((a, b) => a - b);
}

/**
 * The smallest gross pension income, in pence, whose income tax for
 * `year` and `region` leaves at least `targetNet`.
 *
 * Income tax is the only deduction: a pension in payment carries no
 * National Insurance, no student loan repayment and no contribution of
 * its own. The personal allowance taper is included, so the answer is
 * right above the income at which it begins.
 *
 * Found on the linear piece that contains the target, then settled to
 * the penny against this library's own tax figure, because the taper
 * withdraws the allowance in whole pounds and tax is rounded to pence.
 *
 * Throws RangeError for a target that is negative or not a finite
 * number.
 */
export function grossFor(
  targetNet: number,
  year: TaxYear,
  region: TaxRegion,
): number {
  if (!Number.isFinite(targetNet) || targetNet < 0) {
    throw new RangeError(
      `Target net income ${targetNet} is not a non-negative number`,
    );
  }
  if (targetNet === 0) return 0;
  // In pence, as money is: a float a hair either side of a penny must
  // not decide which penny is the answer.
  const config = getTaxYearConfig(year, region);
  const net = (gross: number) => roundPence(gross - incomeTaxOn(gross, config));

  const points = breakpoints(config);
  let high = points[points.length - 1];
  while (net(high) < targetNet) high *= WIDEN_BY;
  points.push(high);

  const upper = points.findIndex((p) => net(p) >= targetNet);
  const lower = points[Math.max(0, upper - 1)];
  const top = points[upper];
  const guess = top === lower
    ? top
    : lower + (targetNet - net(lower)) * (top - lower)
      / (net(top) - net(lower));

  const pounds = (p: number) => p / PENCE_PER_POUND;
  let pence = Math.ceil(guess * PENCE_PER_POUND);
  while (net(pounds(pence)) < targetNet) pence += 1;
  while (pence > 0 && net(pounds(pence - 1)) >= targetNet) pence -= 1;
  return pounds(pence);
}
