/**
 * Income tax on a year's taxable pay, row by band: free pay comes off
 * first, then the code's rule prices what is left. A pure function of
 * its inputs, so the take-home calculation and `grossFor` read one
 * producer and cannot charge the same pay differently.
 */

import {TaxStrategy} from './TaxCode.js';
import type {TaxCode} from './TaxCode.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import {TAX_OPENING_ROW_NAMES, TAX_ROW_KINDS} from './types.js';
import type {TaxBand, TaxBandRow, TaxOpeningRow} from './types.js';
import {amountsByBand} from './deductions.js';
import {charge, sumPence} from './money.js';
import {freePay} from './freePay.js';
import {basicRateBand, dCodeBand} from './flatRate.js';

/** Tax in each band the taxable pay reaches, to the penny. No code taxes
 *  progressively, as 1257L would. */
export function incomeTaxRows(
  taxableGross: number,
  config: TaxYearConfig,
  code: TaxCode | null,
): TaxBandRow[] {
  // A K code's free pay is negative, which adds to the pay taxed.
  const taxable = Math.max(0, taxableGross - freePay(taxableGross, config, code));
  if (!code) return progressiveRows(taxable, config);
  const {rule} = code;
  switch (rule.strategy) {
    case TaxStrategy.NoTax:
      return [];
    case TaxStrategy.BasicRate:
      return [oneRateRow(taxable, basicRateBand(config))];
    case TaxStrategy.FlatRate:
      return [oneRateRow(taxable, dCodeBand(config, code, rule.band))];
    case TaxStrategy.Progressive:
      return progressiveRows(taxable, config);
  }
}

/** The row a breakdown opens with: the statutory allowance, as a payslip
 *  and HMRC's estimator show it, though the bands are worked on free pay.
 *  Under a K code, whose allowance is negative, the row is instead the pay
 *  the code adds, as the estimator prints it. */
export function openingRow(
  personalAllowance: number,
  taxableGross: number,
  code: TaxCode | null,
): TaxOpeningRow {
  if (code?.isKCode) {
    return {
      kind: TAX_ROW_KINDS.KCodeAddition,
      name: TAX_OPENING_ROW_NAMES.kCodePayAdjustment,
      taxableAmount: -personalAllowance,
    };
  }
  return {
    kind: TAX_ROW_KINDS.Allowance,
    name: TAX_OPENING_ROW_NAMES.personalAllowance,
    taxableAmount: Math.min(personalAllowance, taxableGross),
  };
}

/** The tax the rows charge in all: their sum, so the two cannot differ. */
export function taxOf(rows: readonly TaxBandRow[]): number {
  return sumPence(rows.map((row) => row.taxPaid));
}

/** Pay through the year's bands in order. */
function progressiveRows(
  taxable: number,
  config: TaxYearConfig,
): TaxBandRow[] {
  return amountsByBand(taxable, config.incomeTaxBands)
    .map(({band, amount}) => oneRateRow(amount, band));
}

/** One band's row. */
function oneRateRow(amount: number, band: TaxBand): TaxBandRow {
  return {
    kind: TAX_ROW_KINDS.Band,
    name: band.name,
    rate: band.rate,
    taxableAmount: amount,
    taxPaid: charge(amount, band.rate),
  };
}
