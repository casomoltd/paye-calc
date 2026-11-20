/**
 * The National Living Wage, the statutory hourly minimum for workers aged
 * 21 and over, per year.
 *
 * A UK-wide figure, the same for every employer, which is why it sits here
 * beside the other statutory figures rather than in any consumer. It
 * changes on 1 April, five days before the tax year turns, so its table is
 * keyed by the label of the year whose 1 April sets the rate: neither a tax
 * year nor a pay year, and read with either kind of label.
 *
 * The rate and its age band are set under the National Minimum Wage Act
 * 1998 and the National Minimum Wage Regulations 2015, as amended; the
 * figures below are read from GOV.UK's rates page, and the regulations
 * themselves have not been read here.
 */
import {figuresFor} from './perYear.js';
import {YEAR_LABELS} from './types.js';
import type {YearLabel} from './types.js';

/**
 * The hourly rate, by the year whose 1 April it takes effect on.
 *
 * GOV.UK, "National Minimum Wage and National Living Wage rates",
 * https://www.gov.uk/national-minimum-wage-rates, read 20 Nov 2026:
 * "April 2026 (current rate)" £12.71; "April 2025 to March 2026" £12.21;
 * "April 2024 to March 2025" £11.44. The rate has covered workers aged 21
 * and over since 1 April 2024; earlier years set it for an older age band,
 * so they are not held as the same figure. The £13.21 announced for April
 * 2027 waits for its year label.
 */
const HOURLY: Partial<Record<YearLabel, number>> = {
  [YEAR_LABELS.Y2024_25]: 11.44,
  [YEAR_LABELS.Y2025_26]: 12.21,
  [YEAR_LABELS.Y2026_27]: 12.71,
};

/**
 * The National Living Wage per hour for the year whose 1 April sets it.
 * Throws RangeError for a year this library holds no rate for, rather
 * than lending another year's.
 */
export function nationalLivingWageHourly(year: YearLabel): number {
  return figuresFor(HOURLY, year, 'National Living Wage');
}
