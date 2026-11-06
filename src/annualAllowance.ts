/**
 * The pension annual allowance: what a year's pension saving puts into
 * its tests, the two incomes its taper reads (HMRC PTM057100), the
 * allowance left and any excess. None of it changes take-home pay, so
 * it is worked apart from it, from a saving the take-home calculation
 * describes.
 */

import {DB_PENSION_INPUT_MULTIPLIER} from './types.js';
import type {ContributionSplit} from './pensionBases.js';
import {assertPayAmount, uplift} from './money.js';
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
  /** A defined-benefit accrual; its pension input is
   *  `DB_PENSION_INPUT_MULTIPLIER` times it. */
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

/**
 * One arrangement's defined benefits at the start and the end of a
 * pension input period, each in its own date's money: the opening values
 * are uplifted by the period's CPI before they are taken away. An
 * arrangement is Finance Act 2004 s.152(1)'s, which "in relation to a
 * member of a pension scheme, means an arrangement relating to the member
 * under the pension scheme"
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/152). Which of a
 * member's rights make up one arrangement is the caller's to say. The four
 * values are flat, each named for its benefit and its end of the period,
 * so a caller fills them from its own records without a pair type of ours.
 */
export interface ArrangementValues {
  /** The defined benefit pension a year, at the period's start. */
  readonly pensionOpening: number;
  /** The defined benefit pension a year, at the period's end. */
  readonly pensionClosing: number;
  /** The automatic lump sum at the start; nought where none is paid. */
  readonly lumpSumOpening: number;
  /** The automatic lump sum at the end; nought where none is paid. */
  readonly lumpSumClosing: number;
}

/**
 * A pension input period's defined benefit arrangements and the CPI their
 * opening values are uplifted by. Finance Act 2004 ss.238ZA and 238ZB set
 * the pension input periods
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZA). For an
 * arrangement begun before 9 July 2015 they are, from 2016-17, "the tax
 * year 2016-17 and each subsequent tax year" (s.238ZA(3)); for one begun
 * later, after its first period, "each tax year beginning after the end of
 * that period" (s.238ZB(1)).
 */
export interface PensionInputPeriod {
  readonly arrangements: readonly ArrangementValues[];
  /** A decimal: nought where the values are already in today's money. */
  readonly cpi: number;
}

/** Every value an arrangement carries, each checked before it is used. */
const ARRANGEMENT_VALUE_KEYS = [
  'pensionOpening', 'pensionClosing', 'lumpSumOpening', 'lumpSumClosing',
] as const satisfies readonly (keyof ArrangementValues)[];

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
 * A pension input period's defined benefit input across its arrangements
 * (HMRC PTM053301,
 * https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301).
 * Finance Act 2004 s.229(1) arrives at the total "by aggregating the
 * pension input amounts in respect of each arrangement"
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/229), and s.234
 * makes a defined benefits arrangement's amount "the amount of any
 * increase in the value of the individual's rights under the arrangement",
 * an increase being where the opening value "is exceeded by" the closing
 * value (https://www.legislation.gov.uk/ukpga/2004/12/section/234). So each
 * arrangement is worked and floored at nought on its own, then summed.
 *
 * Each arrangement's input is the growth of its pension times
 * `DB_PENSION_INPUT_MULTIPLIER`, plus the growth of its lump sum, each
 * after the opening value's uplift by the period's `cpi` (a decimal:
 * nought where the values are already in today's money). A fall in CPI
 * uplifts nothing: Finance Act 2004 s.235(3) takes the percentage "(if
 * any)" by which the index "is higher", so a negative `cpi` counts as
 * nought. A fall in one arrangement does not offset a rise in another. A
 * negative opening or closing value, a value that is not a finite number,
 * or a `cpi` that is not one, is a caller's error and throws.
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
  {arrangements, cpi}: PensionInputPeriod,
): number {
  assertFiniteRate(cpi);
  arrangements.forEach(assertBenefitValues);
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
 * is the config's `taperFloor` (not zero) and the dual-gate
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
  assertPayAmount(amount, key);
  return amount;
}

/** A defined-benefit accrual's pension input: one arrangement whose
 *  pension grows from nought by the accrual, in today's money, worked by
 *  `definedBenefitInput` so the multiple is applied in one place. */
function dbInput(saving: PensionSaving): number {
  return definedBenefitInput({
    arrangements: [{
      pensionOpening: 0, pensionClosing: saving.dbAnnualAccrual,
      lumpSumOpening: 0, lumpSumClosing: 0,
    }],
    cpi: 0,
  });
}

/** One arrangement's input, never below nought. */
function arrangementInput(values: ArrangementValues, cpi: number): number {
  const pensionIncrease =
    increaseOf(values.pensionOpening, values.pensionClosing, cpi);
  const lumpSumIncrease =
    increaseOf(values.lumpSumOpening, values.lumpSumClosing, cpi);
  return Math.max(0,
    DB_PENSION_INPUT_MULTIPLIER * pensionIncrease + lumpSumIncrease);
}

/**
 * A value's increase over the period: the closing value less the opening
 * value uplifted by the period's CPI. "Increase" is Finance Act 2004
 * s.234(1)'s, "any increase in the value of the individual's rights under
 * the arrangement". The uplift is s.235(3)'s "percentage (if any) by which
 * the consumer prices index ... is higher", so a fall uplifts by nought
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/235). It is
 * negative where the value fell, and `arrangementInput` floors the sum.
 */
function increaseOf(opening: number, closing: number, cpi: number): number {
  return closing - uplift(opening, Math.max(0, cpi));
}

/** Refuse an arrangement whose values are not each a finite amount of
 *  nil or more: no benefit is below nil, and an input worked on one would
 *  be a wrong answer, not an error. */
function assertBenefitValues(values: ArrangementValues): void {
  for (const key of ARRANGEMENT_VALUE_KEYS) {
    assertPayAmount(values[key], `A defined benefit's ${key}`);
  }
}

/** Refuse a CPI that is not a finite number, which would make every
 *  input `NaN` rather than an error. */
function assertFiniteRate(cpi: number): void {
  if (!Number.isFinite(cpi)) {
    throw new RangeError(`cpi ${cpi} is not a finite number`);
  }
}
