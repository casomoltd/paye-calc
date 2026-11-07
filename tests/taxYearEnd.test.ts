/**
 * A tax year named by the year it ends in, and the 6 April and 5 April
 * that bound it: a UK tax year runs from 6 April to the following 5 April
 * (Income Tax Act 2007 s.4(3)), retyped here so a slipped day fails.
 */
import {describe, expect, it} from 'vitest';
import {
  TAX_YEARS, taxYear, taxYearEnd, taxYearEndDate, taxYearEndFor,
  taxYearEndOf, taxYearLabel, taxYearStartDate,
} from '../src/index.js';
import type {TaxYearEnd} from '../src/index.js';

/** `Date`'s month indices, counted from nought. */
const JANUARY_MONTH_INDEX = 0;
const FEBRUARY_MONTH_INDEX = 1;
const APRIL_MONTH_INDEX = 3;
const DECEMBER_MONTH_INDEX = 11;

describe('taxYearEndFor', () => {
  it('turns on 6 April', () => {
    expect(taxYearEndFor(new Date(2026, APRIL_MONTH_INDEX, 6))).toBe(2027);
    expect(taxYearEndFor(new Date(2026, APRIL_MONTH_INDEX, 5, 23, 59))).toBe(2026);
  });

  it('keeps 5 April in the year it closes', () => {
    expect(taxYearEndFor(new Date(2027, APRIL_MONTH_INDEX, 5))).toBe(2027);
  });

  it('reads the first and last days of the calendar year', () => {
    expect(taxYearEndFor(new Date(2026, JANUARY_MONTH_INDEX, 1))).toBe(2026);
    expect(taxYearEndFor(new Date(2026, DECEMBER_MONTH_INDEX, 31))).toBe(2027);
  });

  it('reads 29 February in the year it falls', () => {
    expect(taxYearEndFor(new Date(2028, FEBRUARY_MONTH_INDEX, 29))).toBe(2028);
    expect(taxYearEndFor(new Date(2024, FEBRUARY_MONTH_INDEX, 29))).toBe(2024);
  });
});

describe('taxYearStartDate', () => {
  it('is 6 April of the year before the one named', () => {
    expect(taxYearStartDate(taxYearEnd(2027)))
      .toEqual(new Date(2026, APRIL_MONTH_INDEX, 6));
  });

  it('is the first day taxYearEndFor gives its year', () => {
    const end = taxYearEnd(2030);
    expect(taxYearEndFor(taxYearStartDate(end))).toBe(end);
  });
});

describe('taxYearEndDate', () => {
  it('is 5 April of the year named', () => {
    expect(taxYearEndDate(taxYearEnd(2027)))
      .toEqual(new Date(2027, APRIL_MONTH_INDEX, 5));
  });

  it('is 5 April in a leap year too', () => {
    expect(taxYearEndDate(taxYearEnd(2028)))
      .toEqual(new Date(2028, APRIL_MONTH_INDEX, 5));
  });

  it('is the last day taxYearEndFor gives its year', () => {
    const end = taxYearEnd(2030);
    expect(taxYearEndFor(taxYearEndDate(end))).toBe(end);
  });
});

describe('taxYearEnd', () => {
  it('refuses a year that is not whole', () => {
    expect(() => taxYearEnd(2026.5))
      .toThrow('taxYearEnd: 2026.5 is not a whole four-digit year');
  });

  it('refuses a two-digit year, which Date would read in the 1900s', () => {
    expect(() => taxYearEnd(26))
      .toThrow('taxYearEnd: 26 is not a whole four-digit year');
  });

  it('mints the first and last four-digit years', () => {
    expect(taxYearEnd(1000)).toBe(1000);
    expect(taxYearEnd(9999)).toBe(9999);
  });

  it('refuses the years either side of four digits', () => {
    expect(() => taxYearEnd(999))
      .toThrow('taxYearEnd: 999 is not a whole four-digit year');
    expect(() => taxYearEnd(10000))
      .toThrow('taxYearEnd: 10000 is not a whole four-digit year');
  });
});

describe('a published tax year and its end', () => {
  it.each(Object.values(TAX_YEARS))('%s crosses both ways', (label) => {
    const end = taxYearEndOf(taxYear(label));
    expect(taxYearLabel(end)).toBe(label);
    expect(taxYearEndDate(end).getFullYear()).toBe(end);
  });

  it.each(Object.values(TAX_YEARS))('%s is the same year by date', (label) => {
    const end = taxYearEndOf(taxYear(label));
    const startYear = Number(label.slice(0, label.indexOf('-')));
    expect(taxYearEndFor(new Date(startYear, APRIL_MONTH_INDEX, 6))).toBe(end);
    expect(taxYearStartDate(end)).toEqual(new Date(startYear, APRIL_MONTH_INDEX, 6));
    expect(taxYearEndFor(taxYearStartDate(end))).toBe(end);
    expect(taxYearEndFor(taxYearEndDate(end))).toBe(end);
  });

  it('labels a year no table publishes', () => {
    expect(taxYearLabel(taxYearEnd(2041))).toBe('2040-41');
    expect(taxYearLabel(taxYearEnd(2100))).toBe('2099-00');
  });
});

/** Never run: compiled for its type errors alone. */
export function brandGuards(end: TaxYearEnd): unknown[] {
  return [
    // @ts-expect-error a bare number is not a tax year end
    taxYearEndDate(2027),
    // @ts-expect-error arithmetic gives a plain number, minted again
    taxYearEndDate(end + 1),
    taxYearEndDate(taxYearEnd(end + 1)),
  ];
}
