import type {
  TaxBand,
  NIThresholds,
  StudentLoanPlan,
  StudentLoanThreshold,
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
  year: string;

  /** Personal Allowance - income below this is tax-free */
  personalAllowance: number;

  /**
   * Income threshold where Personal Allowance starts tapering.
   * PA reduces by £1 for every £2 over this threshold.
   */
  personalAllowanceTaperStart: number;

  /** Income tax bands — varies by region */
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

  /**
   * Standard contracted weekly hours for the region — the divisor
   * {@link hoursPerYear} uses to turn an annual salary into an
   * hourly rate.
   *
   * Not a statutory figure: there is no UK-wide contracted week.
   * These are the public-sector full-time weeks the regions
   * actually use (37.5 for rUK; Scotland reduced to 37 from
   * 1 April 2024 and to 36 from 1 April 2026). A caller whose
   * contract differs should convert with its own hours rather
   * than read this.
   */
  standardWeeklyHours: number;

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

/** Annual contracted hours: weekly hours x 52. */
export function hoursPerYear(
  config: TaxYearConfig,
): number {
  return config.standardWeeklyHours * 52;
}

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
 * band is "the higher band" — the two matching rules that used to
 * exist here could diverge on a rename and tax the same salary at
 * two different rates.
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

/**
 * The band a D1 / top-rate code is taxed at.
 *
 * Named differently by region and that is the whole reason this
 * exists: rUK calls it the Additional Rate, Scotland the Top Rate.
 * Reading the LAST band happens to be right for both today, which
 * is why the positional version survived — but it answers "which
 * band is last" when the question is "which band is the top
 * marginal one", and those come apart the moment a region adds a
 * band above it.
 */
export function topMarginalBand(
  config: TaxYearConfig,
): TaxBand {
  const named = config.incomeTaxBands.find(
    (b) => b.name === TAX_BAND_NAMES.additionalRate
      || b.name === TAX_BAND_NAMES.topRate,
  );
  if (!named) {
    throw new Error(
      'topMarginalBand: no '
      + `${TAX_BAND_NAMES.additionalRate} or `
      + `${TAX_BAND_NAMES.topRate} for ${config.region}`,
    );
  }
  return named;
}

/** Gross income at which the higher rate starts — the personal
 *  allowance plus the band's own lower bound. */
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
  if (grossIncome <= config.personalAllowanceTaperStart) {
    return config.personalAllowance;
  }

  const excessIncome =
    grossIncome - config.personalAllowanceTaperStart;
  const reduction = Math.floor(excessIncome / 2);
  const taperedAllowance =
    config.personalAllowance - reduction;

  return Math.max(0, taperedAllowance);
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
  const reduction = Math.floor(excessIncome / 2);
  const taperedAllowance = aa.standard - reduction;

  return Math.max(aa.taperFloor, taperedAllowance);
}
