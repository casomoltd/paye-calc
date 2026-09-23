/**
 * The full rate of the new State Pension, per tax year.
 *
 * A UK-wide figure set each year, the same for every earner, which is
 * why it sits here beside the tax years rather than in any consumer.
 * Only the full rate: what a member is actually due depends on their
 * National Insurance record, which is theirs to state, not this
 * library's to assume.
 */
import {TAX_YEARS} from './types.js';
import type {TaxYear, YearLabel} from './types.js';

/**
 * The weekly full rate, per tax year, in pounds.
 *
 * 2026-27: GOV.UK, "The new State Pension — what you'll get",
 * https://www.gov.uk/new-state-pension/what-youll-get, read 23 Sep
 * 2026: "The full rate of new State Pension is £241.30 a week." The
 * page names no tax year, and the uprating order behind it has not
 * been read; a year is added here when its figure is read at source.
 */
const WEEKLY_FULL_RATE: Partial<Record<YearLabel, number>> = {
  [TAX_YEARS.Y2026_27]: 241.3,
};

/** Weeks in a State Pension year, as GOV.UK turns the weekly rate
 *  into a yearly one. */
const WEEKS_PER_YEAR = 52;

/**
 * A weekly State Pension as a yearly one, the way GOV.UK converts it:
 * for a forecast figure a person reads off their own record, which is
 * weekly, beside a full rate this library holds.
 */
export function statePensionYearly(weekly: number): number {
  if (!Number.isFinite(weekly) || weekly < 0) {
    throw new RangeError(`not a weekly State Pension: ${weekly}`);
  }
  return weekly * WEEKS_PER_YEAR;
}

/**
 * The full new State Pension for a tax year, weekly and yearly.
 * Throws RangeError for a year this library holds no rate for, rather
 * than lending another year's.
 */
export function fullNewStatePension(
  year: TaxYear,
): {weekly: number; yearly: number} {
  const key: YearLabel = year;
  const weekly = WEEKLY_FULL_RATE[key];
  if (weekly === undefined) {
    throw new RangeError(`no full new State Pension rate for ${year}`);
  }
  return {weekly, yearly: statePensionYearly(weekly)};
}
