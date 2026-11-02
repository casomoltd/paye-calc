/**
 * What a year's pension saving puts into the annual-allowance tests: the
 * incomes the taper reads (HMRC PTM057100) and the pension input it is
 * set against. How each contribution counts depends on the basis it is
 * paid on, which is the whole of this module.
 */

import {DB_PENSION_INPUT_MULTIPLIER} from './types.js';
import type {ContributionSplit} from './pensionBases.js';
import type {AnnualAllowanceIncomeInputs} from './TaxYearConfig.js';

/** A year's pay and pension saving, as the allowance tests see them. */
export interface PensionSaving {
  /** The member's own contribution, split as its basis counts it. */
  readonly split: ContributionSplit;
  /** Pay after any pension that comes off before tax. */
  readonly taxableGross: number;
  readonly otherTaxableIncome: number;
  readonly employerContribution: number;
  /** A defined-benefit scheme's accrual for the year, if any. */
  readonly dbAnnualAccrual: number;
}

/**
 * The incomes the taper reads. Only a net-pay contribution is added back
 * as the member's: relief at source counts towards threshold income
 * instead, and salary sacrifice is an employer contribution, as the
 * basis's split says.
 */
export function allowanceIncomes(
  saving: PensionSaving,
): AnnualAllowanceIncomeInputs {
  const {member, sacrifice, reliefAtSource} = saving.split;
  return {
    netIncome: saving.taxableGross + saving.otherTaxableIncome,
    memberContributions: member,
    // The explicit employer contribution, the sacrifice, and a DB
    // scheme's employer element (its input less the member's share).
    employerContributions: saving.employerContribution + sacrifice
      + Math.max(0, dbInput(saving) - member),
    reliefAtSourceContributions: reliefAtSource,
    newSalarySacrifice: sacrifice,
  };
}

/**
 * The year's pension input: a DB accrual's measured input, otherwise
 * the member's and employer's contributions.
 */
export function pensionInput(saving: PensionSaving): number {
  const db = dbInput(saving);
  if (db > 0) return db;
  const {member, sacrifice, reliefAtSource} = saving.split;
  return member + sacrifice + reliefAtSource + saving.employerContribution;
}

/** A defined-benefit accrual's pension input: 16 times the accrual. */
function dbInput(saving: PensionSaving): number {
  return saving.dbAnnualAccrual * DB_PENSION_INPUT_MULTIPLIER;
}
