/**
 * The pension input period: a defined benefit's input across its
 * arrangements, worked from each one's opening and closing values, and the
 * first tax year that is a period. The annual allowance reads it; it reads
 * nothing of the allowance.
 */

import {DB_PENSION_INPUT_MULTIPLIER} from './types.js';
import {assertPayAmount, uplift} from './money.js';
import {taxYearEnd, taxYearLabel} from './taxYearEnd.js';
import type {TaxYearEnd} from './taxYearEnd.js';

/**
 * One arrangement's defined benefits at the start and the end of a
 * pension input period, each in its own date's money: the opening values
 * are uplifted by the period's CPI before they are taken away. An
 * arrangement is Finance Act 2004 s.152(1)'s, which "in relation to a
 * member of a pension scheme, means an arrangement relating to the member
 * under the pension scheme"
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/152). Which of a
 * member's rights make up one arrangement is the caller's to say. The four
 * values are flat, each named for its benefit and its end of the period,
 * so a caller fills them from its own records without a pair type of ours.
 */
export interface ArrangementValues {
  /** The defined benefit pension a year, at the period's start. */
  readonly pensionOpening: number;
  /** The defined benefit pension a year, at the period's end. */
  readonly pensionClosing: number;
  /** The automatic lump sum at the start; nought where none is paid. */
  readonly lumpSumOpening: number;
  /** The automatic lump sum at the end; nought where none is paid. */
  readonly lumpSumClosing: number;
}

/**
 * A pension input period's tax year, its defined benefit arrangements and
 * the CPI their opening values are uplifted by. Finance Act 2004 ss.238ZA
 * and 238ZB set the pension input periods
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZA). For an
 * arrangement begun before 9 July 2015 they are, from 2016-17, "the tax
 * year 2016-17 and each subsequent tax year" (s.238ZA(3)); for one whose
 * commencement date is "9 July 2015 or later", a first period to the next
 * 5 April, then "each tax year beginning after the end of that period"
 * (s.238ZB(1)). Earlier periods were not tax years: one could be
 * nominated, s.238ZA(2) cut each short at 8 July 2015, and the next ran
 * from 9 July 2015 to 5 April 2016. Their rules are not modelled here.
 */
export interface PensionInputPeriod {
  /** The tax year the period is, or, for an arrangement's first period
   *  under s.238ZB, the tax year it ends in: 2016-17 or later, since an
   *  earlier period is refused. */
  readonly taxYearEnd: TaxYearEnd;
  readonly arrangements: readonly ArrangementValues[];
  /** A decimal: nought where the values are already in today's money. */
  readonly cpi: number;
}

/** 2016-17, by the year it ends in. */
const FIRST_PERIOD_YEAR_END = 2017;

/**
 * The first tax year that is itself a pension input period, 2016-17
 * (s.238ZA(3), cited at {@link PensionInputPeriod}). An arrangement begun
 * on or after 9 July 2015 has a first period running from its start, which
 * the caller reads. A period ending before 2016-17 ran on rules not
 * modelled here, so {@link refuseBeforePensionInputPeriods} refuses one
 * rather than work it on today's.
 */
export const FIRST_TAX_YEAR_PENSION_INPUT_PERIOD: TaxYearEnd =
  taxYearEnd(FIRST_PERIOD_YEAR_END);

/** The call `definedBenefitInput`'s refusal names. */
const ASKED = 'definedBenefitInput';

/** Every value an arrangement carries, each checked before it is used. */
const ARRANGEMENT_VALUE_KEYS = [
  'pensionOpening', 'pensionClosing', 'lumpSumOpening', 'lumpSumClosing',
] as const satisfies readonly (keyof ArrangementValues)[];

/**
 * A pension input period's defined benefit input across its arrangements
 * (HMRC PTM053301,
 * https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301).
 * Finance Act 2004 s.229(1) arrives at the total "by aggregating the
 * pension input amounts in respect of each arrangement"
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/229), and s.234
 * makes a defined benefits arrangement's amount "the amount of any
 * increase in the value of the individual's rights under the arrangement",
 * an increase being where the opening value "is exceeded by" the closing
 * value (https://www.legislation.gov.uk/ukpga/2004/12/section/234). So each
 * arrangement is worked and floored at nought on its own, then summed.
 *
 * Each arrangement's input is the growth of its pension times
 * `DB_PENSION_INPUT_MULTIPLIER`, plus the growth of its lump sum, each
 * after the opening value's uplift by the period's `cpi` (a decimal:
 * nought where the values are already in today's money). A fall in CPI
 * uplifts nothing: Finance Act 2004 s.235(3) takes the percentage "(if
 * any)" by which the index "is higher", so a negative `cpi` counts as
 * nought. A fall in one arrangement does not offset a rise in another.
 *
 * A period whose tax year is before 2016-17 ran on rules not modelled here
 * (s.238ZA, cited at {@link PensionInputPeriod}) and throws RangeError, as
 * does a negative opening or closing value, a value that is not a finite
 * number, or a `cpi` that is not one: each is a caller's error.
 *
 * It assumes what the caller must make true:
 * - no benefit was paid, transferred out or taken by a pension debit in
 *   the year; PTM053301 adds each of those back to the closing value, and
 *   nothing here does;
 * - `cpi` is the caller's; HMRC's is the 12 month rise in the CPI to the
 *   September before the tax year starts;
 * - the deferred member exemption is not applied (PTM053301 does not
 *   cover it), so a deferred member's growth counts as any other's.
 */
export function definedBenefitInput(
  {taxYearEnd: end, arrangements, cpi}: PensionInputPeriod,
): number {
  refuseBeforePensionInputPeriods(ASKED, end);
  assertFiniteRate(cpi);
  arrangements.forEach(assertBenefitValues);
  return arrangements.reduce(
    (sum, arrangement) => sum + arrangementInput(arrangement, cpi), 0);
}

/** Throws RangeError for a tax year before
 *  {@link FIRST_TAX_YEAR_PENSION_INPUT_PERIOD}, naming `asked`, the call a
 *  caller was answering. */
export function refuseBeforePensionInputPeriods(
  asked: string, end: TaxYearEnd,
): void {
  if (end < FIRST_TAX_YEAR_PENSION_INPUT_PERIOD) {
    throw new RangeError(
      `${asked}: ${taxYearLabel(end)} is before the first tax year that is `
        + `a pension input period, `
        + taxYearLabel(FIRST_TAX_YEAR_PENSION_INPUT_PERIOD),
    );
  }
}

/** One arrangement's input, never below nought. */
function arrangementInput(values: ArrangementValues, cpi: number): number {
  const pensionIncrease =
    increaseOf(values.pensionOpening, values.pensionClosing, cpi);
  const lumpSumIncrease =
    increaseOf(values.lumpSumOpening, values.lumpSumClosing, cpi);
  return Math.max(0,
    DB_PENSION_INPUT_MULTIPLIER * pensionIncrease + lumpSumIncrease);
}

/**
 * A value's increase over the period: the closing value less the opening
 * value uplifted by the period's CPI. "Increase" is Finance Act 2004
 * s.234(1)'s, "any increase in the value of the individual's rights under
 * the arrangement". The uplift is s.235(3)'s "percentage (if any) by which
 * the consumer prices index ... is higher", so a fall uplifts by nought
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/235). It is
 * negative where the value fell, and `arrangementInput` floors the sum.
 */
function increaseOf(opening: number, closing: number, cpi: number): number {
  return closing - uplift(opening, Math.max(0, cpi));
}

/** Refuse an arrangement whose values are not each a finite amount of
 *  nil or more: no benefit is below nil, and an input worked on one would
 *  be a wrong answer, not an error. */
function assertBenefitValues(values: ArrangementValues): void {
  for (const key of ARRANGEMENT_VALUE_KEYS) {
    assertPayAmount(values[key], `A defined benefit's ${key}`);
  }
}

/** Refuse a CPI that is not a finite number, which would make every
 *  input `NaN` rather than an error. */
function assertFiniteRate(cpi: number): void {
  if (!Number.isFinite(cpi)) {
    throw new RangeError(`cpi ${cpi} is not a finite number`);
  }
}
