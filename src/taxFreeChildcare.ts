/**
 * Tax-Free Childcare's income limit and top-up caps, per tax year.
 *
 * UK-wide figures, the same for every parent, which is why they sit here
 * beside the tax years. The limit is tested on adjusted net income, the
 * measure the personal allowance taper reads, but it is a separate rule:
 * the support stops outright above it, with no taper. Other childcare
 * schemes (England's free hours among them) rest on instruments of their
 * own, not read here.
 */
import type {TaxYear, YearLabel} from './types.js';
import {TAX_YEARS} from './types.js';

/** What a tax year's Tax-Free Childcare turns on, in pounds. */
export interface TaxFreeChildcare {
  /**
   * The adjusted net income above which a parent loses Tax-Free Childcare.
   * Childcare Payments (Eligibility) Regulations 2015 reg 15(1): a person
   * qualifies if they do "not expect their adjusted net income to exceed
   * £100,000 for the relevant tax year"; adjusted net income is ITA 2007
   * s.58(1). https://www.legislation.gov.uk/uksi/2015/448/regulation/15
   */
  readonly incomeLimit: number;
  /**
   * The most the government adds for a child in a year, a cap rather than
   * what every parent gets: "£500 every 3 months (up to £2,000 a year)"
   * (https://www.gov.uk/tax-free-childcare, read 6 Nov 2026). The yearly
   * figure is gov.uk's; the Act's per-period caps have not been read
   * through to it.
   */
  readonly topUpCapPerChild: number;
  /** The same cap for a disabled child: "£1,000 every 3 months (up to
   *  £4,000 a year)", same page and reading. */
  readonly topUpCapPerDisabledChild: number;
}

/** Per tax year; a year is added when its figures are read at source. */
const TAX_FREE_CHILDCARE: Partial<Record<YearLabel, TaxFreeChildcare>> = {
  [TAX_YEARS.Y2026_27]: {
    incomeLimit: 100_000,
    topUpCapPerChild: 2_000,
    topUpCapPerDisabledChild: 4_000,
  },
};

/**
 * A tax year's Tax-Free Childcare figures. Throws RangeError for a year
 * this library holds none for, rather than lending another year's.
 */
export function taxFreeChildcare(year: TaxYear): TaxFreeChildcare {
  const key: YearLabel = year;
  const figures = TAX_FREE_CHILDCARE[key];
  if (figures === undefined) {
    throw new RangeError(`no Tax-Free Childcare figures for ${year}`);
  }
  return figures;
}
