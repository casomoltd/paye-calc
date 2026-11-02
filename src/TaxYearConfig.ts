import type {
  TaxBand,
  NIThresholds,
  StudentLoanPlan,
  StudentLoanThreshold,
  YearLabel,
} from './types.js';
import {TAX_BAND_NAMES} from './types.js';

/**
 * Pension annual allowance limits and taper thresholds —
 * the cap on tax-relieved pension savings per year and the
 * taper that reduces it for high earners. UK-wide.
 * Source: gov.uk "Tax on your private pension
 * contributions" / "Work out your reduced (tapered) annual
 * allowance"; HMRC PTM055100, PTM056510, PTM057100.
 */
export interface AnnualAllowanceConfig {
  /** Standard annual allowance (£60,000 from 2023-24). */
  standard: number;

  /**
   * Money Purchase Annual Allowance — applies once
   * defined-contribution benefits are flexibly accessed
   * (£10,000 from 2023-24).
   */
  moneyPurchase: number;

  /**
   * Adjusted-income limit above which the allowance tapers
   * (£1 per £2 over it), provided threshold income also
   * exceeds thresholdIncomeLimit. £260,000 from 2023-24.
   */
  adjustedIncomeLimit: number;

  /**
   * Threshold-income gate — the taper is disregarded
   * unless threshold income exceeds this, however high
   * adjusted income is. £200,000 from 2023-24.
   */
  thresholdIncomeLimit: number;

  /**
   * Minimum (floor) tapered allowance — the taper cannot
   * reduce the allowance below this. £10,000 from 2023-24.
   */
  taperFloor: number;
}

/**
 * Shared fields across all UK tax year configs.
 * PA, NI, qualifying earnings, and student loans are UK-wide.
 */
interface TaxYearConfigBase {
  /** Tax year identifier, e.g. '2024-25' */
  year: YearLabel;

  /** Personal Allowance - income below this is tax-free */
  personalAllowance: number;

  /**
   * Income threshold where Personal Allowance starts tapering.
   * PA reduces by £1 for every £2 over this threshold.
   */
  personalAllowanceTaperStart: number;

  /**
   * Income tax bands, in order, on TAXABLE income: pay less free pay
   * (`freePay.ts`). The additional rate (Scotland's top rate)
   * starts where the allowance has tapered to nil, so its edge is
   * £125,140 on taxable and total income alike; subtracting the
   * allowance from it, as from the lower edges, overtaxes everyone
   * above about £116,760.
   *
   * rUK: https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
   * Scotland: no published table is cited yet; its bands are pinned by
   * HMRC's payroll test data alone. That data, run in
   * `tests/regression/hmrc.test.ts`, covers 2025-26 and 2026-27 in every
   * region; 2023-24 and 2024-25 have no pack and rest on the snapshots:
   * https://www.gov.uk/government/collections/software-developers-payroll-test-data
   */
  incomeTaxBands: TaxBand[];

  /** National Insurance thresholds and rates */
  nationalInsurance: NIThresholds;

  /**
   * Auto-enrolment qualifying earnings band.
   * Only earnings within this band attract pension contributions
   * under the auto-enrolment scheme.
   */
  qualifyingEarnings: {
    lowerThreshold: number;
    upperThreshold: number;
  };

  /**
   * Student loan repayment thresholds and rates by plan.
   * null means the plan is not available for this tax year
   * (e.g. Plan 5 before April 2026).
   */
  studentLoanThresholds: Record<
    StudentLoanPlan,
    StudentLoanThreshold | null
  >;

  /** Display name for UI */
  displayName: string;

  /** Pension annual allowance limits and taper thresholds. */
  annualAllowance: AnnualAllowanceConfig;
}

/**
 * Config for England, Wales, and Northern Ireland.
 */
export interface TaxYearConfigUk extends TaxYearConfigBase {
  region: 'rUK';
}

/**
 * Config for Scotland (different income tax bands).
 */
export interface TaxYearConfigScotland
  extends TaxYearConfigBase {
  region: 'scotland';
}

/** Discriminated union — region determines income tax bands. */
export type TaxYearConfig =
  | TaxYearConfigUk
  | TaxYearConfigScotland;


/**
 * Both tapers withdraw £1 for every £2 of income over their limit: the
 * Personal Allowance over £100,000 (gov.uk, "Income Tax rates and
 * allowances for current and past years") and the annual allowance over
 * the adjusted-income limit (HMRC PTM057100).
 */
const INCOME_PER_POUND_WITHDRAWN = 2;

/**
 * The higher-rate band for a region.
 *
 * Band ORDER is not band IDENTITY: `incomeTaxBands[0]` is the basic
 * rate in rUK but the STARTER rate in Scotland, and the last band is
 * Scotland's 48% Top Rate — so the higher band is found by name.
 * Every published region defines one, so its absence is a data fault
 * and this throws rather than fall back to a band that merely
 * exists.
 *
 * One producer, so a caller cannot disagree with another about which
 * band is "the higher band": two rules for it could diverge on a
 * rename and tax the same salary at two different rates.
 */
export function taxBandByName(
  config: TaxYearConfig,
  name: string,
): TaxBand {
  const band = config.incomeTaxBands.find(
    (b) => b.name === name,
  );
  if (!band) {
    throw new Error(
      `taxBandByName: no ${name} for ${config.region}`,
    );
  }
  return band;
}

export function higherRateBand(
  config: TaxYearConfig,
): TaxBand {
  return taxBandByName(config, TAX_BAND_NAMES.higherRate);
}

/** The published gross income at which the higher rate starts: the
 *  statutory allowance plus the band's own lower bound (£50,270). PAYE
 *  charges it £9 later, on pay above free pay (`freePay.ts`). */
export function higherRateThreshold(
  config: TaxYearConfig,
): number {
  return config.personalAllowance
    + higherRateBand(config).min;
}

/**
 * Calculate the effective Personal Allowance after taper.
 * PA reduces by £1 for every £2 of income over the taper
 * threshold, until it reaches zero.
 */
export function calculateTaperedPersonalAllowance(
  grossIncome: number,
  config: TaxYearConfig,
): number {
  return Math.max(0, allowanceLeft(grossIncome, config));
}

/**
 * The allowance less the taper, before it is held at nil: negative once
 * the taper would take more than the whole allowance. HMRC's take-home
 * estimator frees £9 above this, so the two differ just past nil
 * (`freePay.ts`).
 */
export function allowanceLeft(
  grossIncome: number,
  config: TaxYearConfig,
): number {
  const excessIncome = Math.max(
    0, grossIncome - config.personalAllowanceTaperStart,
  );
  return config.personalAllowance
    - Math.floor(excessIncome / INCOME_PER_POUND_WITHDRAWN);
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
