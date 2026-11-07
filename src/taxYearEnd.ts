/**
 * A tax year named by the calendar year it ends in, and the dates that
 * bound it. A UK tax year runs from 6 April to the 5 April after it
 * (Income Tax Act 2007 s.4(3),
 * https://www.legislation.gov.uk/ukpga/2007/3/section/4).
 */
import type {TaxYear, YearLabel} from './types.js';

declare const TAX_YEAR_END: unique symbol;

/**
 * The calendar year a tax year ends in: 2027 means 2026-27.
 *
 * A number, not a {@link TaxYear}: that union names only the years this
 * library publishes rates for, so it cannot name a year projected beyond
 * them, which a pension input read year by year to a leaving date needs.
 * {@link taxYearEndOf} and {@link taxYearLabel} cross between the two.
 *
 * The brand is required, unlike `TaxYear`'s phantom, because the number it
 * guards has a twin: a scheme year named by the year its 31 March falls in
 * is a bare number of the same size, and passing one for the other moves
 * every date by five days. A `TaxYearEnd` comes only from
 * {@link taxYearEnd}, {@link taxYearEndFor} or {@link taxYearEndOf};
 * arithmetic on one gives a plain number, which is minted again to be used
 * as one.
 */
export type TaxYearEnd = number & {readonly [TAX_YEAR_END]: 'tax-year-end'};

/** The month a tax year ends in, as `Date` counts months from nought:
 *  April. */
const APRIL_MONTH_INDEX = 3;
/** The day of April a tax year ends on. */
const LAST_DAY_OF_TAX_YEAR = 5;
/** The years a mint accepts: four digits, since `Date` reads a year below
 *  100 as one in the 1900s. */
const FIRST_YEAR = 1000;
const LAST_YEAR = 9999;
/** A label's second year is the last two digits of the year it ends in. */
const CENTURY = 100;
const LABEL_DIGITS = 2;

/** Read `year` as the calendar year a tax year ends in — the only way to
 *  mint a {@link TaxYearEnd} from a number. Throws RangeError for a year
 *  that is not a whole four-digit year. */
export function taxYearEnd(year: number): TaxYearEnd {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) {
    throw new RangeError(`taxYearEnd: ${year} is not a whole four-digit year`);
  }
  return year as TaxYearEnd;
}

/** The tax year a date falls in: 2027 for any day from 6 April 2026 to 5
 *  April 2027, read in local time. */
export function taxYearEndFor(date: Date): TaxYearEnd {
  const year = date.getFullYear();
  const opens = taxYearStartDate(taxYearEnd(year + 1));
  return taxYearEnd(date >= opens ? year + 1 : year);
}

/** 6 April opening the tax year `end`, in the calendar year before it, at
 *  local midnight. */
export function taxYearStartDate(end: TaxYearEnd): Date {
  return new Date(end - 1, APRIL_MONTH_INDEX, LAST_DAY_OF_TAX_YEAR + 1);
}

/** 5 April closing the tax year `end`, at local midnight. */
export function taxYearEndDate(end: TaxYearEnd): Date {
  return new Date(end, APRIL_MONTH_INDEX, LAST_DAY_OF_TAX_YEAR);
}

/** A published tax year by the year it ends in: 2027 for '2026-27'. */
export function taxYearEndOf(year: TaxYear): TaxYearEnd {
  const label: YearLabel = year;
  return taxYearEnd(Number(label.slice(0, label.indexOf('-'))) + 1);
}

/** A tax year as a label writes it, published or not: '2026-27' for
 *  2027. */
export function taxYearLabel(end: TaxYearEnd): string {
  const second = String(end % CENTURY).padStart(LABEL_DIGITS, '0');
  return `${end - 1}-${second}`;
}
