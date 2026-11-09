/**
 * The gross pension income that leaves a target after income tax, the
 * income a gross pension leaves, and an untaxed sum restated as taxable
 * gross: all charged by one tax figure, so a caller comparing incomes
 * after tax reads each from here.
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
import {PENCE_PER_POUND, assertPayAmount, roundPence} from './money.js';

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

/** What a gross income leaves after that tax, to the penny. */
function netOn(gross: number, config: TaxYearConfig): number {
  return roundPence(gross - incomeTaxOn(gross, config));
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
 * What a gross pension income leaves after income tax for `year` and
 * `region`, in pounds to the penny: the forward direction of `grossFor`,
 * charged as `grossFor` charges it, so `netFor(grossFor(x)) >= x`.
 *
 * Income tax is the only deduction, as on a pension in payment, and the
 * personal allowance taper is included.
 *
 * Throws RangeError for a gross that is negative or not a finite number.
 */
export function netFor(
  gross: number,
  year: TaxYear,
  region: TaxRegion,
): number {
  assertPayAmount(gross, 'Gross income');
  return netOn(gross, getTaxYearConfig(year, region));
}

/**
 * The extra taxable income an `untaxed` sum is worth beside `taxable`
 * income, in pounds to the penny: the gross that, taxed with `taxable` for
 * `year` and `region`, would leave the same as the untaxed sum does.
 * Savings spent beside a pension are the case: set against a target before
 * tax, they count as this much income.
 *
 * Nought where `untaxed` is nought. Throws RangeError for an amount that
 * is negative or not a finite number.
 */
export function grossEquivalent(
  taxable: number,
  untaxed: number,
  year: TaxYear,
  region: TaxRegion,
): number {
  assertPayAmount(taxable, 'Taxable income');
  assertPayAmount(untaxed, 'Untaxed sum');
  if (untaxed === 0) return 0;
  return roundPence(
    grossFor(netFor(taxable, year, region) + untaxed, year, region) - taxable);
}

/**
 * The smallest gross pension income, in pounds to the penny, whose
 * income tax for `year` and `region` leaves at least `targetNet`.
 *
 * Income tax is the only deduction: a pension in payment carries no
 * National Insurance, no student loan repayment and no contribution of
 * its own. The personal allowance taper is included, so the answer is
 * right above the income at which it begins.
 *
 * Found on the linear piece that contains the target, then settled to
 * the penny against this library's own tax figure, because the taper
 * withdraws the allowance in whole pounds and tax is rounded to pence.
 * Inside the taper that whole-pound withdrawal makes net dip a few pence
 * at each £2 step, so the answer is the smallest on its piece, which can
 * be pennies above a gross on a neighbouring step that also reaches the
 * target.
 *
 * Throws RangeError for a target that is negative or not a finite
 * number.
 */
export function grossFor(
  targetNet: number,
  year: TaxYear,
  region: TaxRegion,
): number {
  assertPayAmount(targetNet, 'Target net income');
  if (targetNet === 0) return 0;
  const config = getTaxYearConfig(year, region);
  const net = (gross: number) => netOn(gross, config);

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

  // In pence, as money is: a float a hair either side of a penny must
  // not decide which penny is the answer.
  const pounds = (p: number) => p / PENCE_PER_POUND;
  let pence = Math.ceil(guess * PENCE_PER_POUND);
  while (net(pounds(pence)) < targetNet) pence += 1;
  while (pence > 0 && net(pounds(pence - 1)) >= targetNet) pence -= 1;
  return pounds(pence);
}
