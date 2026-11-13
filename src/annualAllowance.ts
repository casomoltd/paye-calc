/**
 * The pension annual allowance: what a year's pension saving puts into
 * its tests, the two incomes its taper reads (HMRC PTM057100), the
 * allowance left and any excess. None of it changes take-home pay, so
 * it is worked apart from it, from a saving the take-home calculation
 * describes. A defined benefit's input is worked by
 * `pensionInputPeriod.ts`.
 */

import type {ContributionSplit} from './pensionBases.js';
import {assertPayAmount} from './money.js';
import {definedBenefitInput} from './pensionInputPeriod.js';
import type {PensionInputPeriod} from './pensionInputPeriod.js';
import {INCOME_PER_POUND_WITHDRAWN} from './TaxYearConfig.js';
import type {TaxYearConfig} from './TaxYearConfig.js';
import type {PayFigures} from './pay.js';
import {taxYearEndOf} from './taxYearEnd.js';
import type {TaxYearEnd} from './taxYearEnd.js';
import {taxYear} from './types.js';

/** The pay a year's allowance tests start from: the take-home
 *  calculation's own figures. */
export type AllowancePay = Pick<PayFigures, 'pensionSplit' | 'taxableGross'>;

/** A year's pay and pension saving, as the allowance tests see them. */
interface PensionSaving {
  /** The tax year the saving is made in. */
  readonly taxYearEnd: TaxYearEnd;
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
  /** A defined-benefit accrual; its pension input is
   *  `DB_PENSION_INPUT_MULTIPLIER` times it. */
  readonly dbAnnualAccrual?: number;
  /** Other taxable income: self-employment, savings, dividends. */
  readonly otherTaxableIncome?: number;
  /** Benefits flexibly accessed, so the money purchase allowance caps. */
  readonly mpaaTriggered?: boolean;
}

/** The two incomes the taper reads, named so they cannot be swapped. */
export interface TaperIncomes {
  readonly thresholdIncome: number;
  readonly adjustedIncome: number;
}

/** The allowance a year's saving meets. */
export interface AnnualAllowance extends TaperIncomes {
  /** The allowance after the taper, or the MPAA where it applies. */
  readonly available: number;
  readonly pensionInput: number;
  /** Saving above the allowance, which the charge falls on. */
  readonly excess: number;
}

/** What a period's input is read against, named so the two sums of
 *  pounds cannot be swapped. */
export interface AllowanceCheck {
  /** Paid into money purchase arrangements in the year. */
  readonly contributions: number;
  /** The allowance to test against. The caller chooses it, the standard
   *  one or a tapered one, so no tax year is looked up here. */
  readonly allowance: number;
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
 * allowance"
 * (https://www.gov.uk/guidance/pension-schemes-work-out-your-tapered-annual-allowance,
 * last updated 16 July 2024, read 7 Nov 2026); HMRC PTM057100.
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
    taxYearEnd: taxYearEndOf(taxYear(config.year)),
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
    : calculateTaperedAnnualAllowance({adjustedIncome, thresholdIncome}, config);
  const input = pensionInput(saving);
  return {
    thresholdIncome,
    adjustedIncome,
    available,
    pensionInput: input,
    excess: excessOver(input, available),
  };
}

/** A period's total pension input amount (Finance Act 2004 s.229(1),
 *  https://www.legislation.gov.uk/ukpga/2004/12/section/229): its defined
 *  benefit input plus `contributions`, paid into money purchase
 *  arrangements in the year. A sum that is negative or not a number is a
 *  caller's error and throws RangeError. */
export function totalPensionInput(
  period: PensionInputPeriod, contributions: number,
): number {
  assertPayAmount(contributions, 'contributions');
  return definedBenefitInput(period) + contributions;
}

/** Whether a period's total pension input exceeds the allowance. A total
 *  at the allowance itself does not: the charge is on "the amount (if any)
 *  by which" it "exceeds" the allowance (Finance Act 2004 s.227ZA(3),
 *  https://www.legislation.gov.uk/ukpga/2004/12/section/227ZA). */
export function allowanceExceeded(
  period: PensionInputPeriod, {contributions, allowance}: AllowanceCheck,
): boolean {
  assertPayAmount(allowance, 'allowance');
  return excessOver(totalPensionInput(period, contributions), allowance) > 0;
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
 * is the config's `taperFloor` (not zero) and the dual-gate
 * means a high adjusted income alone does not trigger the
 * taper.
 *
 * Source: gov.uk taper guidance; HMRC PTM057100/PTM057200.
 */
export function calculateTaperedAnnualAllowance(
  {adjustedIncome, thresholdIncome}: TaperIncomes,
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
 * The default chargeable amount: Finance Act 2004 s.227ZA(3) makes it "the
 * amount (if any) by which" the total pension input amount "exceeds" the
 * annual allowance, and s.227ZA(4) nought "if there is no such excess"
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/227ZA). The
 * alternative amount s.227ZA(1) swaps in once money purchase rights are
 * flexibly accessed is the caller's, through the allowance it passes.
 */
function excessOver(input: number, allowance: number): number {
  return Math.max(0, input - allowance);
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
  key: Exclude<keyof AllowanceExtras, 'mpaaTriggered'>,
): number {
  const amount = extras[key] ?? 0;
  assertPayAmount(amount, key);
  return amount;
}

/** A defined-benefit accrual's pension input: one arrangement whose
 *  pension grows from nought by the accrual, in today's money, worked by
 *  `definedBenefitInput` so the multiple is applied in one place. */
function dbInput(saving: PensionSaving): number {
  return definedBenefitInput({
    taxYearEnd: saving.taxYearEnd,
    arrangements: [{
      pensionOpening: 0, pensionClosing: saving.dbAnnualAccrual,
      lumpSumOpening: 0, lumpSumClosing: 0,
    }],
    cpi: 0,
  });
}
