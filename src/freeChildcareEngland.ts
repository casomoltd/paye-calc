/**
 * England's free childcare for working parents: its income limit, per tax
 * year.
 *
 * A scheme apart from Tax-Free Childcare, with regulations of its own,
 * made under the Childcare Act 2016 ss.1, 2 and 4 (SI 2022/1134's
 * preamble), so it is held apart and cites its own instrument, even where
 * a figure matches. It covers England only; the
 * other nations' schemes are not read here.
 */
import type {TaxYear, YearLabel} from './types.js';
import {TAX_YEARS} from './types.js';

/** What a tax year's free childcare for working parents in England turns
 *  on, in pounds. */
export interface FreeChildcareEngland {
  /**
   * The adjusted net income above which a parent, or their partner, does
   * not qualify. The Childcare (Free of Charge for Working Parents)
   * (England) Regulations 2022 (SI 2022/1134) reg 14(3)(c)(i): a parent
   * who "does not for the relevant tax year ... expect their adjusted net
   * income to exceed £100,000"; reg 15(3)(b)(i) sets the same for a
   * partner; adjusted net income is ITA 2007 s.58 (reg 4(1)).
   * https://www.legislation.gov.uk/uksi/2022/1134/regulation/14, the
   * revised text, read 7 Nov 2026, with no outstanding effects listed.
   */
  readonly incomeLimit: number;
}

/** Per tax year; a year is added when its figures are read at source. */
const FREE_CHILDCARE_ENGLAND:
  Partial<Record<YearLabel, FreeChildcareEngland>> = {
    [TAX_YEARS.Y2026_27]: {incomeLimit: 100_000},
  };

/**
 * A tax year's figures for England's free childcare for working parents.
 * Throws RangeError for a year this library holds none for, rather than
 * lending another year's.
 */
export function freeChildcareEngland(year: TaxYear): FreeChildcareEngland {
  const key: YearLabel = year;
  const figures = FREE_CHILDCARE_ENGLAND[key];
  if (figures === undefined) {
    throw new RangeError(
      `no figures for England's free childcare for working parents for ${year}`);
  }
  return figures;
}
