/**
 * The pension annual allowance: what a year's pension saving puts into
 * its tests, the two incomes its taper reads (HMRC PTM057100), the
 * allowance left and any excess. None of it changes take-home pay, so
 * it is worked apart from it, from a saving the take-home calculation
 * describes.
 */

import {DB_PENSION_INPUT_MULTIPLIER} from './types.js';
import type {ContributionSplit} from './pensionBases.js';
import {INCOME_PER_POUND_WITHDRAWN} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import type {PayFigures} from './pay.js';

/** The pay a year's allowance tests start from: the take-home
 *  calculation's own figures. */
export type AllowancePay = Pick<PayFigures, 'pensionSplit' | 'taxableGross'>;

/** A year's pay and pension saving, as the allowance tests see them. */
interface PensionSaving {
  /** The member's own contribution, split as its basis counts it. */
  readonly split: ContributionSplit;
  /** Pay after any pension that comes off before tax. */
  readonly taxableGross: number;
  readonly otherTaxableIncome: number;
  readonly employerContribution: number;
  /** A defined-benefit scheme's accrual for the year, if any. */
  readonly dbAnnualAccrual: number;
}

/** What the allowance tests take beyond the pay itself; each is £0, or
 *  false, unless given. */
export interface AllowanceExtras {
  /** An employer's defined-contribution payment for the year. */
  readonly employerContribution?: number;
  /** A defined-benefit accrual; its pension input is 16 times it. */
  readonly dbAnnualAccrual?: number;
  /** Other taxable income: self-employment, savings, dividends. */
  readonly otherTaxableIncome?: number;
  /** Benefits flexibly accessed, so the money purchase allowance caps. */
  readonly mpaaTriggered?: boolean;
}

/** The allowance a year's saving meets. */
export interface AnnualAllowance {
  readonly thresholdIncome: number;
  readonly adjustedIncome: number;
  /** The allowance after the taper, or the MPAA where it applies. */
  readonly available: number;
  readonly pensionInput: number;
  /** Saving above the allowance, which the charge falls on. */
  readonly excess: number;
}

/**
 * Income components used to construct the two figures the
 * annual-allowance taper depends on: adjusted income and
 * threshold income. Fields follow the gov.uk step lists
 * (last updated 16 July 2024). Optional fields default to
 * zero — they cover cases (overseas relief, salary
 * sacrifice, death benefits) that don't arise for a
 * typical single UK employment.
 *
 * Source: gov.uk "Work out your reduced (tapered) annual
 * allowance"; HMRC PTM057100.
 */
export interface AnnualAllowanceIncomeInputs {
  /**
   * Net income for the year — total taxable income before
   * the personal allowance, after any net-pay/salary-
   * sacrifice pension deductions (these reduce taxable
   * income, so they are already out of net income).
   */
  netIncome: number;

  /**
   * Member pension contributions relieved by net pay or
   * by claim — added back for adjusted income. Excludes
   * relief-at-source contributions (those affect threshold
   * income only) and salary sacrifice (an employer
   * contribution).
   */
  memberContributions: number;

  /**
   * Employer pension contributions, including the
   * defined-benefit employer element (DB pension input
   * minus the member's own contribution) and any salary-
   * sacrifice amount — added for adjusted income.
   */
  employerContributions: number;

  /**
   * Gross relief-at-source contributions — deducted for
   * threshold income (they were paid from taxed income, so
   * net income still includes them).
   */
  reliefAtSourceContributions: number;

  /**
   * Relief claimed on overseas pension scheme
   * contributions — added for adjusted income.
   */
  overseasContributions?: number;

  /**
   * Salary-sacrifice / flexible-remuneration reductions
   * agreed after 8 July 2015 — added back for threshold
   * income (anti-avoidance rule).
   */
  newSalarySacrifice?: number;

  /**
   * Taxable lump-sum death benefits — deducted from both
   * threshold and adjusted income.
   */
  lumpSumDeathBenefits?: number;
}

/** A defined benefit's value at the start and at the end of a year, each
 *  in its own year's money: the opening is uplifted by the year's CPI
 *  before it is taken away. */
export interface OpeningAndClosing {
  readonly opening: number;
  readonly closing: number;
}

/** One defined benefit arrangement's benefits over the year. */
export interface DefinedBenefitArrangement {
  /** The defined benefit pension, a year. */
  readonly pension: OpeningAndClosing;
  /** The arrangement's automatic lump sum; absent where it pays none. */
  readonly lumpSum?: OpeningAndClosing;
}

/**
 * The allowance a year's saving meets, capped at the MPAA when
 * flexibly-accessed benefits are flagged. An extra not given is nil;
 * a negative one is a caller's error and throws.
 */
export function annualAllowance(
  pay: AllowancePay,
  extras: AllowanceExtras,
  config: TaxYearConfig,
): AnnualAllowance {
  const saving: PensionSaving = {
    split: pay.pensionSplit,
    taxableGross: pay.taxableGross,
    otherTaxableIncome: amountOf(extras, 'otherTaxableIncome'),
    employerContribution: amountOf(extras, 'employerContribution'),
    dbAnnualAccrual: amountOf(extras, 'dbAnnualAccrual'),
  };
  const incomes = allowanceIncomes(saving);
  const thresholdIncome = calculateThresholdIncome(incomes);
  const adjustedIncome = calculateAdjustedIncome(incomes);
  const available = extras.mpaaTriggered === true
    ? config.annualAllowance.moneyPurchase
    : calculateTaperedAnnualAllowance(adjustedIncome, thresholdIncome, config);
  const input = pensionInput(saving);
  return {
    thresholdIncome,
    adjustedIncome,
    available,
    pensionInput: input,
    excess: Math.max(0, input - available),
  };
}

/**
 * A year's defined benefit pension input across `arrangements` (HMRC
 * PTM053301,
 * https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301).
 * Each arrangement's input is the growth of its pension times
 * `DB_PENSION_INPUT_MULTIPLIER`, plus the growth of its lump sum, each
 * after the opening value's uplift by `cpi` (a decimal: nought where the
 * values are already in today's money). A fall in CPI uplifts nothing:
 * Finance Act 2004 s.235(3) takes the percentage "(if any)" by which the
 * index "is higher", so a negative `cpi` counts as nought. Each
 * arrangement is floored at nought on its own, so a fall in one does not
 * offset a rise in another, and the inputs are summed. A negative
 * opening or closing value is a caller's error and throws.
 *
 * It assumes what the caller must make true:
 * - no benefit was paid, transferred out or taken by a pension debit in
 *   the year; PTM053301 adds each of those back to the closing value, and
 *   nothing here does;
 * - `cpi` is the caller's; HMRC's is the 12 month rise in the CPI to the
 *   September before the tax year starts;
 * - the deferred member exemption is not applied (PTM053301 does not
 *   cover it), so a deferred member's growth counts as any other's.
 */
export function definedBenefitInput(
  arrangements: readonly DefinedBenefitArrangement[],
  cpi: number,
): number {
  return arrangements.reduce(
    (sum, arrangement) => sum + arrangementInput(arrangement, cpi), 0);
}

/**
 * Threshold income = net income − gross relief-at-source
 * contributions − taxable lump-sum death benefits + post-
 * 8-July-2015 salary sacrifice / flexible remuneration.
 *
 * Source: gov.uk taper guidance (16 July 2024 step list).
 */
export function calculateThresholdIncome(
  inputs: AnnualAllowanceIncomeInputs,
): number {
  return (
    inputs.netIncome -
    inputs.reliefAtSourceContributions -
    (inputs.lumpSumDeathBenefits ?? 0) +
    (inputs.newSalarySacrifice ?? 0)
  );
}

/**
 * Adjusted income = net income + member contributions
 * (net-pay / relief-claimed) + employer contributions
 * (incl. DB employer element) + overseas relief − taxable
 * lump-sum death benefits.
 *
 * Source: gov.uk taper guidance (16 July 2024 step list).
 */
export function calculateAdjustedIncome(
  inputs: AnnualAllowanceIncomeInputs,
): number {
  return (
    inputs.netIncome +
    inputs.memberContributions +
    inputs.employerContributions +
    (inputs.overseasContributions ?? 0) -
    (inputs.lumpSumDeathBenefits ?? 0)
  );
}

/**
 * Calculate the available pension annual allowance after
 * taper. The allowance reduces by £1 for every £2 of
 * adjusted income over the adjusted-income limit, down to
 * a floor — but only when threshold income also exceeds
 * the threshold-income limit (the anti-avoidance gate).
 *
 * Mirrors calculateTaperedPersonalAllowance, but the floor
 * is the £10k config value (not zero) and the dual-gate
 * means a high adjusted income alone does not trigger the
 * taper.
 *
 * Source: gov.uk taper guidance; HMRC PTM057100/PTM057200.
 */
export function calculateTaperedAnnualAllowance(
  adjustedIncome: number,
  thresholdIncome: number,
  config: TaxYearConfig,
): number {
  const aa = config.annualAllowance;
  const gateOpen =
    thresholdIncome > aa.thresholdIncomeLimit &&
    adjustedIncome > aa.adjustedIncomeLimit;

  if (!gateOpen) {
    return aa.standard;
  }

  const excessIncome =
    adjustedIncome - aa.adjustedIncomeLimit;
  const reduction = Math.floor(excessIncome / INCOME_PER_POUND_WITHDRAWN);
  const taperedAllowance = aa.standard - reduction;

  return Math.max(aa.taperFloor, taperedAllowance);
}

/**
 * The incomes the taper reads. Only a net-pay contribution is added back
 * as the member's: relief at source counts towards threshold income
 * instead, and salary sacrifice is an employer contribution, as the
 * basis's split says.
 */
function allowanceIncomes(
  saving: PensionSaving,
): AnnualAllowanceIncomeInputs {
  const {member, sacrifice, reliefAtSource} = saving.split;
  return {
    netIncome: saving.taxableGross + saving.otherTaxableIncome,
    memberContributions: member,
    // gov.uk's taper guidance takes the employer's share as the scheme's
    // input less the member's own contributions; the sacrifice sits in
    // that input, so it is counted there and nowhere else.
    employerContributions: saving.employerContribution
      + Math.max(0, workplaceInput(saving) - member),
    reliefAtSourceContributions: reliefAtSource,
    newSalarySacrifice: sacrifice,
  };
}

/**
 * The year's pension input. A relief-at-source contribution and the
 * employer's defined-contribution payment always count as paid: each goes
 * to a money purchase pot of its own. The workplace scheme's input is
 * `workplaceInput`.
 */
function pensionInput(saving: PensionSaving): number {
  const paidToOwnPots = saving.split.reliefAtSource
    + saving.employerContribution;
  return workplaceInput(saving) + paidToOwnPots;
}

/**
 * The workplace scheme's input. Net-pay and salary-sacrifice money goes
 * to that scheme, so where it accrues a defined benefit the money is
 * inside the DB input and is not counted again; where it accrues none,
 * the money counts as paid.
 */
function workplaceInput(saving: PensionSaving): number {
  const accruesDefinedBenefit = saving.dbAnnualAccrual > 0;
  if (accruesDefinedBenefit) return dbInput(saving);
  return paidToWorkplaceScheme(saving.split);
}

/** The member's contribution that goes to the workplace scheme: net pay
 *  and salary sacrifice, but not relief at source. */
function paidToWorkplaceScheme({member, sacrifice}: ContributionSplit): number {
  return member + sacrifice;
}

/** An extra's amount, nil when not given. */
function amountOf(
  extras: AllowanceExtras,
  key: 'employerContribution' | 'dbAnnualAccrual' | 'otherTaxableIncome',
): number {
  const amount = extras[key] ?? 0;
  if (amount < 0) throw new RangeError(`${key} cannot be negative: ${amount}`);
  return amount;
}

/** A defined-benefit accrual's pension input: one arrangement whose
 *  pension grows from nought by the accrual, in today's money. */
function dbInput(saving: PensionSaving): number {
  return definedBenefitInput(
    [{pension: {opening: 0, closing: saving.dbAnnualAccrual}}], 0);
}

/** One arrangement's input, never below nought. */
function arrangementInput(
  {pension, lumpSum}: DefinedBenefitArrangement, cpi: number,
): number {
  const lumpSumGrowth = lumpSum === undefined ? 0 : growthOf(lumpSum, cpi);
  return Math.max(0,
    DB_PENSION_INPUT_MULTIPLIER * growthOf(pension, cpi) + lumpSumGrowth);
}

/** Growth after the opening value's CPI uplift, which a fall in CPI
 *  leaves at nought (Finance Act 2004 s.235(3)). */
function growthOf({opening, closing}: OpeningAndClosing, cpi: number): number {
  if (opening < 0 || closing < 0) {
    throw new RangeError(
      `A defined benefit cannot be negative: ${opening} to ${closing}`);
  }
  return closing - opening * (1 + Math.max(0, cpi));
}
