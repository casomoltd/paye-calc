/**
 * How a per-tax-year table of cited figures is read, package-private.
 *
 * Each table holds only the years whose figures were read at source, so a
 * year it lacks is refused rather than answered with another year's.
 */
import type {TaxYear, YearLabel} from './types.js';

/**
 * `year`'s entry in `table`. Throws RangeError naming `what` for a year
 * the table holds none for. The table is `Partial` because a year is added
 * only when its figures are read, and this is the one place that absence
 * is answered.
 */
export function figuresFor<T>(
  table: Partial<Record<YearLabel, T>>, year: TaxYear, what: string,
): T {
  const key: YearLabel = year;
  const figures = table[key];
  if (figures === undefined) {
    throw new RangeError(`no ${what} for ${year}`);
  }
  return figures;
}
