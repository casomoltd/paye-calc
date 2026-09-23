/**
 * The gross pension income that leaves a target after income tax.
 *
 * This is not `TakeHomePay`'s inverse. That one inverts the whole of an
 * earner's take-home pay — pension contributions, National Insurance,
 * student loan — which is the right question for a salary and the wrong
 * one for a pension in payment, where income tax is the only deduction.
 */
import {GrossAnnual} from './types.js';
import type {TaxRegion, TaxYear} from './types.js';
import {TakeHomePay} from './TakeHomePay.js';
import {getTaxYearConfig} from './taxYears/index.js';
import {calculateTaperedPersonalAllowance} from './TaxYearConfig.js';

/** Income tax on a gross income with nothing else deducted, as this
 *  library charges it: the tapered personal allowance, the region's
 *  bands, rounded to the penny. */
function incomeTaxOn(
  gross: number,
  year: TaxYear,
  region: TaxRegion,
): number {
  const calc = new TakeHomePay(year, region);
  calc.setSalary(GrossAnnual(gross));
  return calc.incomeTax;
}

/**
 * The gross incomes at which the marginal rate changes: the personal
 * allowance, each band edge, and the two ends of the allowance taper.
 * Between two of them income tax is linear in gross, which is what
 * makes the inverse a straight line on each piece.
 */
function breakpoints(year: TaxYear, region: TaxRegion): number[] {
  const config = getTaxYearConfig(year, region);
  const allowance = config.personalAllowance;
  const taperFrom = config.personalAllowanceTaperStart;
  // The allowance lost per pound of income inside the taper, read off
  // the library's own taper rather than restated here.
  const perPound = (allowance
    - calculateTaperedPersonalAllowance(taperFrom + 2, config)) / 2;
  const taperTo = taperFrom + allowance / perPound;
  const edges = config.incomeTaxBands
    .flatMap((b) => [b.min, b.max])
    .filter(Number.isFinite);
  const points = [0, allowance, taperFrom, taperTo];
  for (const edge of edges) {
    // Where taxable income reaches `edge`: gross less the allowance
    // below the taper, less a shrinking allowance inside it, and gross
    // itself once the allowance is gone.
    points.push(edge + allowance);
    points.push(
      (edge + allowance + perPound * taperFrom) / (1 + perPound),
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
  const net = (gross: number) =>
    Math.round((gross - incomeTaxOn(gross, year, region)) * 100) / 100;

  const points = breakpoints(year, region);
  let high = points[points.length - 1];
  while (net(high) < targetNet) high *= 2;
  points.push(high);

  const upper = points.findIndex((p) => net(p) >= targetNet);
  const lower = points[Math.max(0, upper - 1)];
  const top = points[upper];
  const guess = top === lower
    ? top
    : lower + (targetNet - net(lower)) * (top - lower)
      / (net(top) - net(lower));

  let pence = Math.ceil(guess * 100);
  while (net(pence / 100) < targetNet) pence += 1;
  while (pence > 0 && net((pence - 1) / 100) >= targetNet) pence -= 1;
  return pence / 100;
}
