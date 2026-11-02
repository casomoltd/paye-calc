import type {TaxRegion} from '../../../src/types';

/**
 * The rates each of HMRC's workbooks is worked at. Wales has its own
 * workbook (C codes) but, today, the rest of the UK's rates.
 */
export const WORKBOOK_RATES = {
  rUK: 'rUK',
  scotland: 'scotland',
  wales: 'rUK',
} as const satisfies Record<string, TaxRegion>;

/** One sheet of HMRC's payroll test data, transcribed as printed. */
export interface PayeSheet {
  readonly workbook: string;
  readonly sheet: string;
  readonly region: keyof typeof WORKBOOK_RATES;
  /** Cumulative PAYE, or week 1 / month 1 (each period on its own). */
  readonly basis: 'cumulative' | 'w1m1';
  readonly periodsPerYear: 12 | 52;
  readonly rows: readonly PayeRow[];
}

/** One pay period, in the sheet's own column order. */
export type PayeRow = readonly [
  code: string,
  period: number,
  grossPay: number,
  taxablePayToDate: number,
  taxDue: number,
  taxDueToDate: number,
];
