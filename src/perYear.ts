/**
 * How a per-year table of cited figures is read, package-private.
 *
 * Each table holds only the years whose figures were read at source, so a
 * year it lacks is refused rather than answered with another year's. The
 * year is a label: a tax-year table is read with a `TaxYear`, which
 * assigns to it, and a table keyed some other way with its own label.
 */
import type {YearLabel} from './types.js';

/**
 * `year`'s entry in `table`. Throws RangeError naming `what` for a year
 * the table holds none for. The table is `Partial` because a year is added
 * only when its figures are read, and this is the one place that absence
 * is answered.
 */
export function figuresFor<T>(
  table: Partial<Record<YearLabel, T>>, year: YearLabel, what: string,
): T {
  const figures = table[year];
  if (figures === undefined) {
    throw new RangeError(`no ${what} for ${year}`);
  }
  return figures;
}
