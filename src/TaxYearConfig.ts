import type {
  TaxBand,
  TaxBandName,
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
   * Scotland: until the Scottish Government's rates table is cited
   * here, its bands are pinned by HMRC's payroll test data alone. That data, run in
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
export const INCOME_PER_POUND_WITHDRAWN = 2;

/** A band by name; throws when the year has none, a data fault. */
export function taxBandByName(
  config: TaxYearConfig,
  name: TaxBandName,
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

/** The income at which the taper has taken the whole allowance:
 *  £125,140 when it starts at £100,000 on £12,570. */
export function personalAllowanceTaperEnd(config: TaxYearConfig): number {
  return config.personalAllowanceTaperStart
    + config.personalAllowance * INCOME_PER_POUND_WITHDRAWN;
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
